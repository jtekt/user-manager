const {drivers: {v2: driver}} = require('../../db.js')
const dotenv = require('dotenv')
const newUserSchema = require('../../schemas/newUser.js')
const {
  user_editable_fields,
  admin_editable_fields,
} = require('../../schemas/editableUserFields.js')
const {
  get_current_user_id,
  hash_password,
  compare_password,
  user_query,
  user_id_filter,
  error_handling,

} = require('../../utils.js')

dotenv.config()



exports.get_user = (req, res) => {

  // Route to retrieve an employee's data

  // Retrieve employee ID
  // NOTE: Employee ID is NOT Employee number
  let {user_id} = req.params
  if(user_id === 'self') user_id = get_current_user_id(res)
  if(!user_id) return res.status(400).send(`user_id not defined`)

  // Forcing as string, hopefully just temporary
  // was needed for whereabouts
  user_id = user_id.toString()

  const session = driver.session()
  const query = `${user_query} RETURN user`
  session.run(query, { user_id })
  .then( ({records}) => {

    if(!records.length) {
      console.log(`[Neo4J] User ${user_id} not found`)
      return res.status(400).send(`User ${user_id} not found`)
    }

    const user = records[0].get('user')
    delete user.properties.password_hashed

    res.send(user)

    console.log(`[Neo4J] Profile of user ${user_id} queried`)
  })
  .catch(error => {
    console.error(error)
    res.status(400).send(`Error accessing DB: ${error}`)
  })
  .finally( () => { session.close() })
}

exports.get_users = (req, res) => {
  // Route to retrieve employees

  const {search, ids, employee_numbers} = req.query

  let search_query = ''
  if(search) {
    search_query = `
    // Make a list of the keys of each node
    // Additionally, filter out fields that should not be searched
    WITH [key IN KEYS(user) WHERE NOT key IN $exceptions] AS keys, user

    // Unwinding
    UNWIND keys as key

    // Filter nodes by looking for properties
    WITH key, user
    WHERE toLower(toString(user[key])) CONTAINS toLower($search)
    `
  }

  let ids_query = ''
  if(ids) {
    search_query = `
    WITH user
    UNWIND $ids as id
    WITH id, user
    WHERE user._id = toString(id)
    `
  }

  // specific to this app
  // UNUSED
  let employee_numbers_query = ''
  if(employee_numbers) {
    search_query = `
    WITH user
    UNWIND $employee_numbers as employee_number
    WITH employee_number, user
    WHERE user.employee_number=employee_number
    `
  }

  const query = `
    MATCH (user:User)
    ${search_query}
    ${ids_query}

    RETURN DISTINCT user

    // TODO: BATCHING

    LIMIT 200
    `

  const parameters = {
    exceptions: [ 'password_hashed' ],
    search,
    ids,
    employee_numbers,
  }

  const session = driver.session()
  session.run(query, parameters)
  .then(({records}) => {

    const employees = records.map(record => record.get('user'))
    employees.forEach( employee => { delete employee.properties.password_hashed })

    res.send( employees )
    console.log(`[Neo4J] Users queried`)
   })
  .catch(error => {
    console.error(error)
    res.status(400).send(`Error accessing DB: ${error}`)
  })
  .finally( () => { session.close() })
}

exports.patch_user = (req, res) => {

  const current_user_id = get_current_user_id(res)
  const current_user_is_admin = res.locals.user.properties.isAdmin

  let {user_id} = req.params
  if(user_id === 'self') user_id = current_user_id

  const properties = req.body

  if(!user_id) {
    console.log(`Missing user_id`)
    return res.status(400).send(`Missing user_id`)
  }

  // Prevent normal users to modify another user
  if(!current_user_is_admin && user_id != current_user_id){
    return res.status(403).send(`Unauthorized to modify another user's data`)
  }

  const customizable_fields = current_user_is_admin ? admin_editable_fields : user_editable_fields

  // prevent user from modifying disallowed properties
  for (let [key, value] of Object.entries(properties)) {
    if(!customizable_fields.includes(key)){
      console.log(`Attempt to modify forbidden key: ${key}`)
      return res.status(403).send(`Not allowed to modify property ${key}`)
    }
  }

  const session = driver.session()

  const query = `
    ${user_query}

    // += implies update of existing properties
    SET user += $properties

    RETURN user
    `
  const params = { user_id, properties }

  session.run(query, params)
  .then(({records}) => {

    if(!records.length) {
      console.log(`[Neo4J] User ${user_id} not found`)
      return res.status(400).send(`User ${user_id} not found`)
    }

    res.send( records[0].get('user') )
    console.log(`User ${user_id} patched`)
  })
  .catch(error => { error_handling(error,res)})
  .finally( () => session.close())

}



const create_admin_if_not_exists = async () => {

  console.log(`[Neo4J] Creating admin account`)

  const session = driver.session()

  try {
    const {
      DEFAULT_ADMIN_USERNAME: admin_username = 'administrator',
      DEFAULT_ADMIN_PASSWORD: admin_password = 'administrator',
    } = process.env


    const password_hashed = await hash_password(admin_password)

    const query = `
      // Find the administrator account or create it if it does not exist
      MERGE (administrator:User {username:$admin_username})

      // Make the administrator an actual administrator
      SET administrator.isAdmin = true

      // Check if the administrator account is missing its password
      // If the administrator account does not have a password (newly created), set it
      WITH administrator
      WHERE NOT EXISTS(administrator.password_hashed)
      SET administrator.password_hashed = $password_hashed

      // Set some additional properties
      SET administrator.display_name = 'Administrator'
      SET administrator._id = randomUUID() // THIS IS IMPORTANT

      // Return the account
      RETURN administrator
      `

    const {records} = await session.run(query, { admin_username, password_hashed })

    if(records.length) console.log(`[Neo4J] Admin creation: user ${admin_username} created`)
    else console.log(`[Neo4J] Admin creation: admin already existed`)



  } catch (error) {
    console.log(error)
    console.log(`[Neo4J] Admin creation failed, retrying in 10s...`)
    setTimeout(create_admin_if_not_exists,10000)

  } finally {
    session.close()
  }

}
exports.create_admin_if_not_exists = create_admin_if_not_exists


exports.get_employees_of_group = (req, res) => {
  // Route to retrieve employees of a group

  // Retrieve employee ID
  let {group_id} = req.params

  const session = driver.session()
  session
  .run(`
    // Find the employee using the ID
    MATCH (group:Group)<-[:BELONGS_TO]-(employee:Employee)
    WHERE group._id = $group_id
      // OR id(group)=toInteger($group_id) // REMOVED QUERY USING INTERNAL ID

    with employee
    MATCH (group:Group)<-[:BELONGS_TO]-(employee:Employee)-[:WORKS_IN]->(workplace:Workplace)

    RETURN employee, collect(group) as groups, collect(workplace) as workplaces
    `, { group_id })
  .then( ({records}) => {
    const response = records.map(record => ({
      ...record.get('employee'),
      workplaces: record.get('workplaces'),
      groups: record.get('groups'),
    }))
    res.send(response)
  })
  .catch(error => {
    console.error(error)
    res.status(400).send(`Error accessing DB: ${error}`)
  })
  .finally( () => { session.close() })
}
