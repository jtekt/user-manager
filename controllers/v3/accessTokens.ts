import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { getUserFromCache, removeUserFromCache, setUserInCache } from "../../cache";
import { user_query } from "../../utils/users";
import { driver } from "../../db";
import { generate_token, verify_token } from "../../utils/tokens";

export const revokeToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = driver.session();

  try {
    const current_user = res.locals.user;
    const current_user_id = current_user._id;
    const user_is_admin = res.locals.user.isAdmin;

    let { user_id } = req.params;
    if (user_id === "self") user_id = current_user_id;

    // Prevent an user from modifying another's password
    if (String(user_id) !== String(current_user_id) && !user_is_admin) {
      throw createHttpError(403, `Unauthorized to modify another user`);
    }

    // WARNING: user_id can be employee_number or email
    const query = `
      ${user_query}
      SET user.token_id = randomUUID()
      RETURN user
      `;

    const { records } = await session.run(query, { identifier: user_id });
    if (!records.length)
      throw createHttpError(404, `User ${user_id} not found`);

    const { properties: user } = records[0].get("user");
    delete user.password_hashed;

    console.log(`[Neo4J] Token of user ${user_id} revoked`);
    removeUserFromCache(user);
    res.send(user);
  } catch (error) {
    next(error);
  } finally {
    session.close();
  }
};

export const decodeToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { token } = req.body;
  if (!token) throw createHttpError(400, `No token provided`);
  const decodedToken = verify_token(token);
  if (!decodedToken) throw createHttpError(403, `Invalid token`);
  res.send(decodedToken);
};

export const generate_token_for_user = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user_id } = req.params;
    const requester = res.locals.user;

    if (!user_id) throw createHttpError(400, "user_id not defined");
    if (!requester) throw createHttpError(401, "User not authenticated");

    const isSelf = user_id === "self";

    if (!isSelf && !requester.isAdmin) {
      throw createHttpError(403, "Forbidden");
    }

    let user = requester;

    if (!isSelf) {
      user = await getUserFromCache(user_id);

      if (!user) {
        const session = driver.session();
        try {
          const query = `${user_query} RETURN properties(user) AS user`;
          const { records } = await session.run(query, { identifier: user_id });

          if (!records.length) {
            throw createHttpError(404, `User ${user_id} not found`);
          }

          user = records[0].get("user");
          user.cached = false;
          setUserInCache(user);
        } finally {
          await session.close();
        }
      }
    }

    res.send(await generate_token(user));
  } catch (err) {
    next(err);
  }
};
