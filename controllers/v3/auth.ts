import createHttpError from "http-errors";
import { compare_password } from "../../utils/passwords";
import {
  get_auth_user,
  login_user_query,
  oidc_user_query,
  register_last_login,
  user_query,
} from "../../utils/users";
import { authenticateWithLdap } from "../../ldap";
import { Request, Response, NextFunction } from "express";
import { driver } from "../../db";
import {
  retrieve_jwt,
  verify_token,
  generate_token,
  verify_token_oidc,
  decode_token,
} from "../../utils/tokens";
import { jwt_expiration_time, oidc_jwks_uri } from "../../config";
import createJwksClient from "jwks-rsa";
import {
  getUserFromCache,
  removeUserFromCache,
  setUserInCache,
} from "../../cache";
import { authMiddlewareChainer } from "@moreillon/express-auth-middleware-chainer";

let jwksClient: ReturnType<typeof createJwksClient> | null = null;

export const initializeOidcAuth = () => {
  if (oidc_jwks_uri && !jwksClient) {
    console.log(
      `[Auth] Initializing OIDC client with JWKS URI: ${oidc_jwks_uri}`
    );
    jwksClient = createJwksClient({
      jwksUri: oidc_jwks_uri,
      cache: true,
      rateLimit: true,
    });
  }
};

// NOTE: this is only used for login
const find_user_in_db = async (identifier: string) => {
  const session = driver.session();
  try {
    const query = `${login_user_query} RETURN properties(user) as user`;
    const { records } = await session.run(query, { identifier });

    if (!records.length)
      throw createHttpError(403, `User ${identifier} not found`);

    if (records.length > 1)
      throw createHttpError(500, `Multiple users identified as ${identifier}`);

    return records[0].get("user");
  } catch (error: any) {
    if (error.status) throw error;
    throw createHttpError(500, error);
  } finally {
    session.close();
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Input parsing
    const { username, email_address, email, identifier, password } = req.body;
    const userIdentifier = username || email_address || email || identifier;

    if (!userIdentifier) throw createHttpError(400, `Missing user identifier`);
    if (!password) throw createHttpError(400, `Missing password`);

    // User query
    const user = (await find_user_in_db(userIdentifier)) as any;
    const { locked, password_hashed } = user;

    // Lock check
    if (locked) throw createHttpError(403, `Account is locked`);

    // Password check
    const promises = [
      compare_password(password, password_hashed),
      authenticateWithLdap(user.email_address, password),
    ];
    const result = await Promise.all(promises);
    const password_correct = result.some((i) => !!i);

    if (!password_correct) throw createHttpError(403, `Incorrect password`);

    const jwt = await generate_token(user);

    register_last_login(user);
    removeUserFromCache(user);

    delete user.password_hashed;
    // TODO: refresh token
    res.send({ jwt, user });
  } catch (error) {
    next(error);
  }
};

const legacyAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = retrieve_jwt(req, res) as string;
  const decodedToken = (await verify_token(token)) as any;
  const { user_id, token_id: tokenIdFromToken, iat } = decodedToken;
  if (!user_id) throw createHttpError(401, `Token does not contain user_id`);

  let user = await getUserFromCache(user_id);

  if (!user) {
    // NOTE: this only operates with _id
    const query = `MATCH (user:User { _id: $_id }) RETURN properties(user) as user`;
    const params = { _id: user_id.toString() };
    user = await get_auth_user(query, params);
    setUserInCache(user);
  }

  if (!user) throw createHttpError(401, `User does not exist`);

  // Token checks
  if (tokenIdFromToken !== user.token_id) {
    console.log(
      `[Auth v3] Token has been revoked for user ${user.email_address}`
    );
    throw createHttpError(401, `Token has been revoked`);
  }

  if (jwt_expiration_time && jwt_expiration_time !== "infinite") {
    const now = new Date().getTime() / 1000;
    if (now - iat > Number(jwt_expiration_time))
      throw createHttpError(401, `Token has expired`);
  }

  res.locals.user = user;
  next();
};

const oidcAuthMiddlewareFactory = () => {
  initializeOidcAuth();

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = retrieve_jwt(req, res) as string;
      const decoded = decode_token(token) as any;
      if (!decoded) throw `Decoded token is null`;

      const kid = decoded.header?.kid;
      if (!kid) throw "Missing token kid";
      const key = await jwksClient!.getSigningKey(kid);
      let oidcUser = (await verify_token_oidc(
        token,
        key.getPublicKey()
      )) as any;

      // Uses the preferred_username field as the identifier for OIDC
      let user = await getUserFromCache(oidcUser.preferred_username);

      if (!user) {
        const query = `${oidc_user_query} RETURN properties(user) as user`;
        const params = { identifier: oidcUser.preferred_username };
        user = await get_auth_user(query, params);
        setUserInCache(user, "username");
      }
      res.locals.user = user;
      next();
    } catch (err: any) {
      if (err.status) throw err;
      throw createHttpError(401, `Failed to retrieve or verify OIDC token: ${err}`);
    }
  };
};

export const middlewareChain = authMiddlewareChainer([
  legacyAuthMiddleware,
  oidcAuthMiddlewareFactory(),
]);
