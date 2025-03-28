import { identifierFields, oidc_identifier_field } from "../config";
import { driver } from "../db";
import { Response } from "express";

export const get_id_of_user = (user: any) => {
  return user._id ?? user.properties._id ?? user.identity.low ?? user.identity;
};

export const get_current_user_id = (res: Response) => {
  const user = res.locals.user;
  return get_id_of_user(user);
};

const identificationArgs = identifierFields
  .map((f) => `user.${f} = $identifier`)
  .join(" OR ");

export const user_query = ` MATCH (user:User) WHERE ${identificationArgs}`;
export const oidc_user_query = ` MATCH (user:User)  WHERE user.${oidc_identifier_field} = $identifier `;

export const register_last_login = async (user: any) => {
  const session = driver.session();

  try {
    const user_id = get_id_of_user(user);
    const query = `
      ${user_query}
      SET user.last_login = date()
      RETURN user.last_login as last_login
      `;

    await session.run(query, { identifier: user_id });
  } catch (error) {
    throw error;
  } finally {
    session.close();
  }
};

export const get_auth_user = async (query: string, params: any) => {
  const session = driver.session();
  let user: any;
  try {
    const { records } = await session.run(query, params);

    if (!records.length)
      throw `User with ${JSON.stringify(params)} not found in the DB`;
    if (records.length > 1)
      throw `Multiple users with ${JSON.stringify(params)} found in the DB`;
    user = records[0].get("user");
    user.cached = false;
  } catch (error) {
    console.log(`error: ${error}`);
    throw error;
  } finally {
    session.close();
  }
  return user;
};
