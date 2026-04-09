import {
  userQueryIdentifierFields,
  loginIdentifierFields,
  oidc_identifier_field,
} from "../config";
import { driver } from "../db";
import { Response } from "express";

export const get_id_of_user = (user: any) => {
  return user._id ?? user.properties._id ?? user.identity.low ?? user.identity;
};

export const get_current_user_id = (res: Response) => {
  const user = res.locals.user;
  return get_id_of_user(user);
};

// When user_id is passed in routes such as /users/:user_id
export const user_query = ` MATCH (user:User) WHERE ${userQueryIdentifierFields
  .map((f) => `user.${f} = $identifier`)
  .join(" OR ")}`;

// Used to query users during login
export const login_user_query = ` MATCH (user:User) WHERE ${loginIdentifierFields
  .map((f) => `user.${f} = $identifier`)
  .join(" OR ")}`;

export const oidc_user_query = ` MATCH (user:User)  WHERE user.${oidc_identifier_field} = $identifier `;

export const register_last_login = async (user: any) => {
  const session = driver.session();
  const user_id = get_id_of_user(user);
  const query = `
    ${user_query}
    SET user.last_login = date()
    RETURN user.last_login as last_login
    `;
  try {
    await session.run(query, { identifier: user_id });
  } finally {
    session.close();
  }
};

export const get_auth_user = async (query: string, params: any) => {
  const session = driver.session();
  try {
    const { records } = await session.run(query, params);

    if (!records.length)
      throw new Error(`[Neo4j] [Authv3] User with ${JSON.stringify(params)} not found in the DB`);

    if (records.length > 1)
      throw new Error(`[Neo4j] [Authv3] Multiple users with ${JSON.stringify(params)} found in the DB`);

    const user = records[0].get("user");
    user.cached = false;
    return user;
  } finally {
    session.close();
  }
};
