import createHttpError from "http-errors";
import { passwordUpdateSchema } from "../../schemas/passwords";
import { send_password_reset_email } from "../../mail";
import { hash_password } from "../../utils/passwords";
import { get_current_user_id, user_query } from "../../utils/users";
import { driver } from "../../db";
import { Request, Response, NextFunction } from "express";

export const update_password = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = driver.session();

  try {
    // Get current user ID
    const current_user_id = get_current_user_id(res);
    const user_is_admin = res.locals.user.isAdmin;

    // Input parsing
    let { user_id } = req.params;

    if (user_id === "self") user_id = current_user_id;
    if (!user_id) throw createHttpError(400, `Missing user ID`);

    // Prevent an user from modifying another's password
    if (String(user_id) !== String(current_user_id) && !user_is_admin) {
      throw createHttpError(
        403,
        `Unauthorized to modify another user's password`
      );
    }

    try {
      await passwordUpdateSchema.validateAsync(req.body);
    } catch (error: any) {
      throw createHttpError(400, error.message);
    }

    const { new_password, new_password_confirm } = req.body;
    // TODO: compare new_password_confirm

    const password_hashed = await hash_password(new_password);

    const query = `
      ${user_query}
      SET user.password_hashed = $password_hashed
      SET user.password_changed = true
      RETURN properties(user) as user
      `;

    const { records } = await session.run(query, {
      identifier: user_id,
      password_hashed,
    });
    if (!records.length)
      throw createHttpError(404, `User ${user_id} not found`);
    // NEED TO REMOVE PASSWORD HASHED FROM RESPONSE

    res.send(records[0].get("user"));
    console.log(`[Neo4J] Password of user ${user_id} updated`);
  } catch (error) {
    next(error);
  } finally {
    session.close();
  }
};

export const request_password_reset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = driver.session();

  const { PASSWORD_RESET_URL: url = req.headers.origin } = process.env;

  try {
    const { email_address } = req.body;
    if (!email_address) throw createHttpError(400, `Missing email address`);

    const query = `
      MATCH (user:User)
      WHERE user.email_address = $email_address
      RETURN properties(user) as user
      `;
    const { records } = await session.run(query, { email_address });
    if (!records.length) throw createHttpError(400, `User not found`);

    const user = records[0].get("user");

    const mail_options = { url, user };
    await send_password_reset_email(mail_options);

    res.send({ email_address });
  } catch (error) {
    next(error);
  } finally {
    session.close();
  }
};
