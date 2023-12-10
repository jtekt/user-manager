import { driver } from "../../db"
import createHttpError from "http-errors"
import { compare_password } from "../../utils/passwords"
import { authenticateWithLdap, hostname as ldapHostname } from "../../ldap"
import { register_last_login, user_query } from "../../utils/users"
import { Request, Response, NextFunction } from "express"

import { retrieve_jwt, decode_token, generate_token } from "../../utils/tokens"

const { IDENTIFIER_FIELDS = "" } = process.env

const find_user_in_db = (identifier: string) =>
  new Promise((resolve, reject) => {
    // The error management here is quite bad
    const session = driver.session()

    const identifierFields = ["email_address", "username", "_id"]

    if (IDENTIFIER_FIELDS)
      IDENTIFIER_FIELDS.split(",").forEach((f) => identifierFields.push(f))

    const identificationArgs = identifierFields
      .map((f) => `user.${f} = $identifier`)
      .join(" OR ")

    const query = `
    MATCH (user:User)
    WHERE ${identificationArgs}
    RETURN DISTINCT(user)
    `

    session
      .run(query, { identifier })
      .then(({ records }: any) => {
        if (!records.length)
          return reject(createHttpError(403, `User ${identifier} not found`))
        if (records.length > 1)
          return reject(
            createHttpError(
              500,
              `Multiple users identitfied as ${identifier} found`
            )
          )

        const user = records[0].get("user")

        resolve(user)
      })
      .catch((error) => {
        reject({ code: 500, message: error })
      })
      .finally(() => session.close())
  })

export const middleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = driver.session()

  try {
    const token = (await retrieve_jwt(req, res)) as string
    const { user_id, token_id: tokenFromJwt }: any = await decode_token(token)

    const query = `${user_query} RETURN user`

    const params = { user_id: user_id.toString() } // Forcing string
    const { records } = await session.run(query, params)

    if (!records.length)
      throw `[Neo4J] User ${user_id} not found in the database`
    if (records.length > 1)
      throw `Multiple users with ID ${user_id} found in the database`

    const user = records[0].get("user")

    if (tokenFromJwt !== user.token_id) throw `Token has been revoked`

    // save user in res locasl so that it can use in other places
    res.locals.user = user

    next()
  } catch (error) {
    console.log(error)
    res.status(403).send(error)
  } finally {
    session.close()
  }
}

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
      req.body.identifier

    const { password } = req.body

    if (!identifier)
      throw createHttpError(400, `Missing username or e-mail address`)
    if (!password) throw createHttpError(400, `Missing password`)

    // User query
    const user = (await find_user_in_db(identifier)) as any

    // Lock check
    if (user.properties.locked) throw createHttpError(403, `Account is locked`)

    // Password check
    let password_correct = await compare_password(
      password,
      user.properties.password_hashed
    )

    // Fallback to LDAP if available
    if (!password_correct && ldapHostname)
      password_correct = await authenticateWithLdap(
        user.properties.email_address,
        password
      )

    if (!password_correct) throw createHttpError(403, `Incorrect password`)

    await register_last_login(user)

    const jwt = await generate_token(user)

    res.send({ jwt, user })

    console.log(
      `[Auth v2] Successful login from user identified as ${identifier}`
    )
  } catch (error) {
    console.log(error)
    next(error)
  }
}
