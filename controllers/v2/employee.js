const {drivers: {v2: driver}} = require('../../db.js')
const dotenv = require('dotenv')
const {
  get_current_user_id,
  user_query,
} = require('../../utils/users.js')

dotenv.config()



exports.get_user = (req, res, next) => {

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
  })
  .catch(next)
  .finally( () => { session.close() })
}

exports.get_users = (req, res,next) => {
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
  .catch(next)
  .finally( () => { session.close() })
}
