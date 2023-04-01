const createHttpError = require("http-errors")
const dotenv = require("dotenv")
const { hash_password } = require("../../utils/passwords.js")
const {
  drivers: { v2: driver },
} = require("../../db.js")
const {
  newUserSchema,
  userUpdateSchema,
  userAdminUpdateSchema,
} = require("../../schemas/users.js")
const { get_current_user_id, user_query } = require("../../utils/users.js")

dotenv.config()

exports.create_user = async (req, res, next) => {
  const session = driver.session()

  try {
    if (!res.locals.user.isAdmin)
      throw createHttpError(403, `Only administrators can create users`)

    const properties = req.body
    try {
      await newUserSchema.validateAsync(properties)
    } catch (error) {
      throw createHttpError(400, error)
    }

    const { username, password, email_address, display_name } = properties

    const password_hashed = await hash_password(password)

    const query = `
      // Merge with email_address as unique
      CREATE (user:User:Employee)

      SET user += $user_properties
      SET user._id = randomUUID()
      SET user.creation_date = date()

      // Return the account
      RETURN properties(user) as user
      `

    const user_properties = {
      username,
      email_address,
      password_hashed,
      display_name: display_name || username || email_address,
    }

    const { records } = await session.run(query, { user_properties })

    const user = records[0].get("user")
    delete user.password_hashed

    console.log(`[Neo4J] User ${user._id} created`)

    res.send(user)
  } catch (error) {
    next(error)
  } finally {
    session.close()
  }
}

exports.get_users = (req, res, next) => {
  const {
    search,
    ids,
    employee_numbers, // TODO: this is specific to this company
    batch_size = 100,
    start_index = 0,
    ...filters
  } = req.query

  const search_query = `
    // Make a list of the keys of each node
    // Additionally, filter out fields that should not be searched
    WITH [key IN KEYS(user) WHERE NOT key IN $exceptions] AS keys

    // Unwinding
    UNWIND keys as key

    // Filter nodes by looking for properties
    WITH key
    // NOTE: This overrides previous MATCH
    OPTIONAL MATCH (user:User)
    WHERE toLower(toString(user[key])) CONTAINS toLower($search)
    `

  const filtering_query = `
    UNWIND KEYS($filters) as filterKey
    // This WITH is needed to isolate from previous MATCH
    WITH filterKey
    // NOTE: This overrides previous MATCH
    OPTIONAL MATCH (user:User)
    WHERE user[filterKey] = $filters[filterKey]
      `

  const ids_query = `
    UNWIND $ids as id
    // This WITH is needed to isolate from previous MATCH
    WITH id
    // NOTE: This overrides previous MATCH
    OPTIONAL MATCH (user:User {_id: id})
    `

  // specific to this app
  const employee_numbers_query = `
    UNWIND $employee_numbers as employee_number
    // This WITH is needed to isolate from previous MATCH
    WITH employee_number
    // NOTE: This overrides previous MATCH
    OPTIONAL MATCH (user:User {employee_number: toString(employee_number)})
    `

  const query = `
    OPTIONAL MATCH (user:User)
    ${search ? search_query : ""}
    ${Object.keys(filters).length ? filtering_query : ""}
    ${ids ? ids_query : ""}
    ${employee_numbers ? employee_numbers_query : ""}

    // Aggregation
    WITH
      COLLECT(DISTINCT properties(user)) as users,
      COUNT(DISTINCT user) as count,
      toInteger($start_index) as start_index,
      toInteger($batch_size) as batch_size,
      (toInteger($start_index)+toInteger($batch_size)) as end_index

    // Batching
    RETURN
      count,
      users[start_index..end_index] AS users,
      start_index,
      batch_size
    `

  const parameters = {
    exceptions: ["password_hashed", "_id", "avatar_src"],
    search,
    ids,
    employee_numbers,
    start_index,
    batch_size,
    filters,
  }

  const session = driver.session()
  session
    .run(query, parameters)
    .then(({ records }) => {
      const record = records[0]
      if (!record) throw createHttpError(404, `No user found`)

      const users = record.get("users")
      users.forEach((user) => {
        delete user.password_hashed
      })

      const response = {
        batch_size: record.get("batch_size"),
        start_index: record.get("start_index"),
        count: record.get("count"),
        users,
      }

      console.log(`[Neo4j] Users queried`)

      res.send(response)
    })
    .catch(next)
    .finally(() => {
      session.close()
    })
}

exports.get_user = (req, res, next) => {
  // Route to retrieve an employee's data

  // Retrieve employee ID
  // NOTE: Employee ID is NOT Employee number
  let { user_id } = req.params
  if (user_id === "self") user_id = get_current_user_id(res)
  if (!user_id) throw createHttpError(400, `user_id not defined`)

  // Forcing as string, hopefully just temporary
  // was needed for whereabouts
  user_id = user_id.toString()

  const session = driver.session()

  const query = `
    ${user_query}
    RETURN properties(user) as user
    `

  session
    .run(query, { user_id })
    .then(({ records }) => {
      if (!records.length)
        throw createHttpError(400, `User ${user_id} not found`)

      const user = records[0].get("user")
      delete user.password_hashed

      res.send(user)
    })
    .catch(next)
    .finally(() => {
      session.close()
    })
}

exports.patch_user = async (req, res, next) => {
  try {
    const current_user_id = get_current_user_id(res)
    const current_user_is_admin = res.locals.user.isAdmin

    let { user_id } = req.params
    if (user_id === "self") user_id = current_user_id
    if (!user_id) throw createHttpError(400, `Missing user_id`)

    // Prevent normal users to modify another user
    if (!current_user_is_admin && user_id != current_user_id) {
      throw createHttpError(403, `Unauthorized to modify another user's data`)
    }

    const properties = req.body

    try {
      if (current_user_is_admin)
        await userAdminUpdateSchema.validateAsync(properties)
      else await userUpdateSchema.validateAsync(properties)
    } catch (error) {
      throw createHttpError(403, error)
    }

    const session = driver.session()

    const query = `
      ${user_query}

      // += implies update of existing properties
      SET user += $properties

      RETURN user
      `
    const params = { user_id, properties }

    const { records } = await session.run(query, params)

    if (!records.length) throw createHttpError(404, `User ${user_id} not found`)

    res.send(records[0].get("user"))
    console.log(`User ${user_id} patched`)
  } catch (error) {
    next(error)
  }
}

exports.delete_user = (req, res, next) => {
  // Prevent normal users to delete a user
  if (!res.locals.user.isAdmin)
    throw createHttpError(403, `Unauthorized to delete users`)

  const { user_id } = req.params

  if (!user_id) throw createHttpError(404, `User ID not defined`)

  const session = driver.session()

  const query = `
    ${user_query}
    DETACH DELETE (user)
    RETURN $user_id as user_id
    `

  session
    .run(query, { user_id })
    .then(({ records }) => {
      if (!records.length)
        throw createHttpError(404, `User ${user_id} not found`)
      console.log(`User ${user_id} deleted`)
      res.send({ user_id })
    })
    .catch(next)
    .finally(() => session.close())
}
