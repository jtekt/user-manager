import createHttpError from "http-errors"
import { compare_password } from "../../utils/passwords"
import { get_auth_user, register_last_login, user_query } from "../../utils/users"
import { authenticateWithLdap } from "../../ldap"
import { Request, Response, NextFunction } from "express"
import { driver } from "../../db"
import { retrieve_jwt, verify_token, generate_token, verify_token_oidc, decode_token } from "../../utils/tokens"
import { identifierFields, jwt_expiration_time, oidc_jwks_uri } from "../../config"
import createJwksClient from "jwks-rsa"
import {
  getUserFromCache,
  removeUserFromCache,
} from "../../cache"
import { authMiddlewareChainer } from "@moreillon/express-auth-middleware-chainer"

let jwksClient: ReturnType<typeof createJwksClient> | null = null;

export const initializeOidcAuth = () => {
  if (oidc_jwks_uri && !jwksClient) {
    console.log(`[Auth] Initializing OIDC client with JWKS URI: ${oidc_jwks_uri}`);
    jwksClient = createJwksClient({
      jwksUri: oidc_jwks_uri,
      cache: true,
      rateLimit: true,
    });
  }
};

const find_user_in_db = (identifier: string) =>
  new Promise((resolve, reject) => {
    // The error handling here is quite bad
    const session = driver.session()

    const identificationArgs = identifierFields
      .map((f) => `user.${f} = $identifier`)
      .join(" OR ")

    const query = `
    MATCH (user:User)
    WHERE ${identificationArgs}
    RETURN properties(user) as user
    `

    session
      .run(query, { identifier })
      .then(({ records }) => {
        if (!records.length)
          return reject(createHttpError(403, `User ${identifier} not found`))
        if (records.length > 1)
          return reject(
            createHttpError(500, `Multiple users identitfied as ${identifier}`)
          )

        const user = records[0].get("user")

        console.log(
          `[Neo4j] User ${identifier} found in the DB (ID: ${user._id})`
        )

        resolve(user)
      })
      .catch((error: any) => {
        reject(createHttpError(500, error))
      })
      .finally(() => session.close())
  })

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Input parsing
    const { username, email_address, email, identifier, password } = req.body
    const userIdentifier = username || email_address || email || identifier

    if (!userIdentifier) throw createHttpError(400, `Missing user identifier`)
    if (!password) throw createHttpError(400, `Missing password`)

    // User query
    const user = (await find_user_in_db(userIdentifier)) as any
    const { locked, password_hashed } = user

    // Lock check
    if (locked) throw createHttpError(403, `Account is locked`)

    // Password check
    const promises = [
      compare_password(password, password_hashed),
      authenticateWithLdap(user.email_address, password),
    ]
    const result = await Promise.all(promises)
    const password_correct = result.some((i) => !!i)

    if (!password_correct) throw createHttpError(403, `Incorrect password`)

    const jwt = await generate_token(user)

    register_last_login(user)
    removeUserFromCache(user._id)

    console.log(`[Auth] Successful login from user ${userIdentifier}`)

    // TODO: refresh token
    res.send({ jwt, user })
  } catch (error) {
    next(error)
  }
}

const legacyAuthMiddleware = async (
  req: Request,
  res: Response, next: NextFunction) => {
  const token = (await retrieve_jwt(req, res)) as string;
  const decodedToken = (await verify_token(token)) as any;
  const { user_id, token_id: tokenIdFromToken, iat } = decodedToken;
  if (!user_id) throw `Token does not contain user_id`;

  let user = await getUserFromCache(user_id);

  if (!user) {
    const session = driver.session();
    try {
      const query = `
          ${user_query}
          RETURN properties(user) as user
        `;
      const params = { user_id: user_id.toString() };
      user = await get_auth_user(query, params);
    } catch (error) {
      throw error
    } finally {
      session.close()
    }

  }

  if (!user) throw `User does not exist`

  // Token checks
  if (tokenIdFromToken !== user.token_id) {
    console.log(
      `[Auth v3] Token has been revoked for user ${user.email_address}`
    )
    throw `Token has been revoked`
  }

  if (jwt_expiration_time && jwt_expiration_time !== "infinite") {
    const now = new Date().getTime() / 1000
    if (now - iat > Number(jwt_expiration_time)) throw `Token has expired`
  }

  res.locals.user = user;
  next();
};

const oidcAuthMiddle = async (
  req: Request,
  res: Response, next: NextFunction) => {
  try {
    const token = (await retrieve_jwt(req, res)) as string;
    const decoded = decode_token(token) as any;
    if (!decoded) throw `Decoded token is null`;

    const kid = decoded.header?.kid
    if (!kid) throw "Missing token kid"
    const key = await jwksClient!.getSigningKey(kid)
    let keycloakUser = (await verify_token_oidc(token, key.getPublicKey())) as any;

    //  TODO: Use an env variable on caching
    // let user = await getUserFromCache(keycloakUser.preferred_username);

    let user: any;
    // if (!user) {
    try {
      const username_filter = ` WHERE user.username = $username `
      const user_query_username = ` MATCH (user:User) ${username_filter}`
      const query = `
        ${user_query_username}
        RETURN properties(user) as user
      `;
      const params = { username: keycloakUser.preferred_username };
      user = await get_auth_user(query, params);
    } catch (error) {
      console.log(`error: ${error}`)
      throw error
    }

    // }
    res.locals.user = user;
    next()
  } catch (err) {
    throw "Failed to retrieve or verify OIDC token: " + err;
  }
};

export const middlewareChain = authMiddlewareChainer([
  legacyAuthMiddleware,
  oidcAuthMiddle,
])