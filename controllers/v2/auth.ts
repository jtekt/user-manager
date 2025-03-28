import { driver } from "../../db";
import createHttpError from "http-errors";
import { compare_password } from "../../utils/passwords";
import { authenticateWithLdap, hostname as ldapHostname } from "../../ldap";
import { login_user_query, register_last_login } from "../../utils/users";
import { Request, Response, NextFunction } from "express";
import { retrieve_jwt, verify_token, generate_token } from "../../utils/tokens";

// This is only used for login
const find_user_in_db = (identifier: string) =>
  new Promise((resolve, reject) => {
    // The error management here is quite bad
    const session = driver.session();

    const query = `${login_user_query} RETURN DISTINCT(user)`;

    session
      .run(query, { identifier })
      .then(({ records }: any) => {
        if (!records.length)
          return reject(createHttpError(403, `User ${identifier} not found`));
        if (records.length > 1)
          return reject(
            createHttpError(
              500,
              `Multiple users identitfied as ${identifier} found`
            )
          );

        const user = records[0].get("user");

        resolve(user);
      })
      .catch((error) => {
        reject({ code: 500, message: error });
      })
      .finally(() => session.close());
  });

export const middleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = driver.session();

  try {
    const token = (await retrieve_jwt(req, res)) as string;
    const { user_id, token_id: tokenIdFromJwt }: any = await verify_token(
      token
    );

    const query = ` MATCH (user:User { _id: $_id }) RETURN user`;
    const params = { _id: user_id.toString() }; // Forcing string
    const { records } = await session.run(query, params);

    if (!records.length)
      throw `[Neo4J] [Auth v2] User ${user_id} not found in the database`;

    // TODO: might want to remove this check
    if (records.length > 1)
      throw `[Neo4J] [Auth v2] Multiple users with ID ${user_id} found in the database`;

    const user = records[0].get("user");

    if (tokenIdFromJwt !== user.properties.token_id) {
      throw `Token has been revoked for user identified by ${identifier}`;
    }

    // save user in res locasl so that it can use in other places
    res.locals.user = user;

    next();
  } catch (error) {
    console.log(error);
    res.status(403).send(error);
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

    res.send({ jwt, user });

    console.log(
      `[Auth v2] Successful login from user identified as ${identifier}`
    );
  } catch (error) {
    console.log(error);
    next(error);
  }
};
