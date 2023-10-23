const createHttpError = require("http-errors")
const { compare_password } = require("../../utils/passwords.js")
const { register_last_login, user_query } = require("../../utils/users.js")
const { authenticateWithLdap, hostname: ldapHostname } = require("../../ldap")

const {
  drivers: { v2: driver },
} = require("../../db.js")
const {
  retrieve_jwt,
  decode_token,
  generate_token,
} = require("../../utils/tokens.js")
const {
  getUserFromCache,
  setUserInCache,
  removeUserFromCache,
} = require("../../cache.js")

const find_user_in_db = (identifier) =>
  new Promise((resolve, reject) => {
    // The error handling here is quite bad
    const session = driver.session()

    const query = `
    MATCH (user:User)

    // Allow user to identify using either userrname or email address
    // NOTE: using employee number is not supported yet
    WHERE user.email_address = $identifier
      OR user.username = $identifier
      OR user._id = $identifier

    // Return user if found
    RETURN properties(user) as user
    `

    session
      .run(query, { identifier })
      .then(({ records }) => {
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

        console.log(`[Neo4j] User ${identifier} successfully found in the DB`)

        resolve(user)
      })
      .catch((error) => {
        reject(createHttpError(500, error))
      })
      .finally(() => session.close())
  })

exports.middleware = async (req, res, next) => {
  let user_id
  try {
    const token = await retrieve_jwt(req, res)
    const decodedToken = await decode_token(token)
    user_id = decodedToken.user_id
    if (!user_id) throw `Token does not contain user_id`
  } catch (error) {
    console.error(error)
    res.status(403).send(error)
    return
  }

  let user = await getUserFromCache(user_id)
  if (user) {
    res.locals.user = user
    next()
    return
  }

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
    await setUserInCache(user)
    user.cached = false

    // save user in res locasl so that it can use in other places
    res.locals.user = user

    next()
  } catch (error) {
    console.error(error)
    res.status(403).send(error)
  } finally {
    session.close()
  }
}

exports.login = async (req, res, next) => {
  try {
    // Input parsing
    const { username, email_address, email, identifier, password } = req.body
    const userIdentifier = username || email_address || email || identifier

    if (!userIdentifier) throw createHttpError(400, `Missing user identifier`)
    if (!password) throw createHttpError(400, `Missing password`)

    // User query
    const user = await find_user_in_db(userIdentifier)
    const { locked, password_hashed } = user

    // Lock check
    if (locked) throw createHttpError(403, `Account is locked`)

    // Password check

    let password_correct = await compare_password(password, password_hashed)

    // Fallback to LDAP if available
    if (!password_correct && ldapHostname)
      password_correct = await authenticateWithLdap(
        user.email_address,
        password
      )

    if (!password_correct) throw createHttpError(403, `Incorrect password`)

    await register_last_login(user)

    const jwt = await generate_token(user)

    console.log(
      `[Auth] Successful login from user identified as ${userIdentifier}`
    )

    removeUserFromCache(user._id)

    res.send({ jwt, user })
  } catch (error) {
    next(error)
  }
}
