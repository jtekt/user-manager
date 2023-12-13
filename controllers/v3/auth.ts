import createHttpError from "http-errors"
import { compare_password } from "../../utils/passwords"
import { register_last_login, user_query } from "../../utils/users"
import { authenticateWithLdap } from "../../ldap"
import { Request, Response, NextFunction } from "express"
import { driver } from "../../db"
import { retrieve_jwt, decode_token, generate_token } from "../../utils/tokens"
import {
  getUserFromCache,
  setUserInCache,
  removeUserFromCache,
} from "../../cache"

const { IDENTIFIER_FIELDS = "", JWT_EXPIRATION_TIME = "3600" } = process.env

const find_user_in_db = (identifier: string) =>
  new Promise((resolve, reject) => {
    // The error handling here is quite bad
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

export const middleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = (await retrieve_jwt(req, res)) as string
    const decodedToken = (await decode_token(token)) as any
    const { user_id, token_id: tokenIdFromToken, iat } = decodedToken
    if (!user_id) throw `Token does not contain user_id`

    let user = await getUserFromCache(user_id)

    if (!user) {
      const session = driver.session()
      try {
        const query = `
        ${user_query}
        RETURN properties(user) as user
        `
        const params = { user_id: user_id.toString() } // Forcing string
        const { records } = await session.run(query, params)

        if (!records.length) throw `User ${user_id} not found in the database`
        if (records.length > 1)
          throw `Multiple users with ID ${user_id} found in the database`

        user = records[0].get("user")

        setUserInCache(user)
        user.cached = false
      } catch (error) {
        throw error
      } finally {
        session.close()
      }
    }

    if (!user) throw `User does not exist`

    // Token checks
    if (tokenIdFromToken !== user.token_id) throw `Token has been revoked`

    if (JWT_EXPIRATION_TIME && JWT_EXPIRATION_TIME !== "infinite") {
      const now = new Date().getTime() / 1000
      if (now - iat) throw `Token has expired`
    }

    res.locals.user = user
    next()
  } catch (error) {
    console.error(error)
    res.status(403).send(error)
  }
}
