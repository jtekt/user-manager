import { driver } from "../../db";
import createHttpError from "http-errors";
import { compare_password } from "../../utils/passwords";
import { authenticateWithLdap, hostname as ldapHostname } from "../../ldap";
import { login_user_query, register_last_login } from "../../utils/users";
import { Request, Response, NextFunction } from "express";
import { retrieve_jwt, verify_token, generate_token } from "../../utils/tokens";

// This is only used for login
const find_user_in_db = async (identifier: string) => {
  const session = driver.session();
  try {
    const query = `${login_user_query} RETURN DISTINCT(user)`;
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

export const middleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = retrieve_jwt(req, res) as string;
    const { user_id, token_id: tokenIdFromJwt }: any = await verify_token(token);

    const session = driver.session();
    let user: any;
    try {
      const query = `MATCH (user:User { _id: $_id }) RETURN user`;
      const { records } = await session.run(query, { _id: user_id.toString() });

      if (!records.length)
        throw createHttpError(401, `User ${user_id} not found`);

      if (records.length > 1)
        throw createHttpError(500, `Multiple users with ID ${user_id} found`);

      user = records[0].get("user");
    } finally {
      session.close();
    }

    if (tokenIdFromJwt !== user.properties.token_id)
      throw createHttpError(401, `Token has been revoked`);

    res.locals.user = user;
    next();
  } catch (err: any) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Input management
    const identifier =
      req.body.username ||
      req.body.email_address ||
      req.body.email ||
      req.body.identifier;

    const { password } = req.body;

    if (!identifier)
      throw createHttpError(400, `Missing username or e-mail address`);
    if (!password) throw createHttpError(400, `Missing password`);

    // User query
    const user = (await find_user_in_db(identifier)) as any;

    // Lock check
    if (user.properties.locked) throw createHttpError(403, `Account is locked`);

    // Password check
    let password_correct = await compare_password(
      password,
      user.properties.password_hashed
    );

    // Fallback to LDAP if available
    if (!password_correct && ldapHostname)
      password_correct = await authenticateWithLdap(
        user.properties.email_address,
        password
      );

    if (!password_correct) throw createHttpError(403, `Incorrect password`);

    await register_last_login(user);

    const jwt = await generate_token(user);

    delete user.properties.password_hashed;
    res.send({ jwt, user });

    console.log(
      `[Auth v2] Successful login from user identified as ${identifier}`
    );
  } catch (error) {
    console.log(error);
    next(error);
  }
};
