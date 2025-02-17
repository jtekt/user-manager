import { oidc_identifier_field } from "../config"
import { driver } from "../db"
import { Response } from "express"

export const get_id_of_user = (user: any) => {
  return user._id ?? user.properties._id ?? user.identity.low ?? user.identity
}

export const get_current_user_id = (res: Response) => {
  const user = res.locals.user
  return get_id_of_user(user)
}

export const user_id_filter = ` WHERE user._id = $user_id `

export const user_query = ` MATCH (user:User) ${user_id_filter}`
export const oidc_user_query = ` MATCH (user:User)  WHERE user.${oidc_identifier_field} = $identifier `

export const register_last_login = async (user: any) => {
  const session = driver.session()

  try {
    const user_id = get_id_of_user(user)
    const query = `
      ${user_query}
      SET user.last_login = date()
      RETURN user.last_login as last_login
      `

    await session.run(query, { user_id })
  } catch (error) {
    throw error
  } finally {
    session.close()
  }
}

export const get_auth_user = async (query: string, params: any) => {
  const session = driver.session();
  let user: any;
  try {
    const { records } = await session.run(query, params);

    if (!records.length) throw `User ${params} not found in the database`
    if (records.length > 1)
      throw `Multiple users with params ${params} found in the database`
    user.cached = false;
    user = records[0].get("user")
  } catch (error) {
    console.log(`error: ${error}`)
    throw error
  } finally {
    session.close()
  }
  return user;
}
