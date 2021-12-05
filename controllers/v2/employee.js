const {drivers: {v2: driver}} = require('../../db.js')
const bcrypt = require('bcrypt')
const {
  get_current_user_id,
  hash_password,
  compare_password,
} = require('../../utils.js')





exports.create_employee = (req, res) => {

  // WARNING: USER COULD BE CREATED WITH MORE PROPERTIES THAN ANTICIPATED

  const current_user_id =  get_current_user_id(res)

  // Prevent normal users to create a user
  if(!res.locals.user.properties.isAdmin){
    console.log(`Unauthorized to create a user`)
    return res.status(403).send(`Unauthorized to create a user`)
  }

  const mandatory_properties = [
    'email_address',
    'employee_number',
    'first_name',
    'family_name',
  ]

  // compute a list of properties missing from the body
  const missing_properties = mandatory_properties.filter( key => !req.body[key] )

  if(missing_properties.length > 0 ) {
    const message = `Missing properties: ${missing_properties.join(', ')}`
    console.log(message)
    return res.status(400).send(message)
  }

  const password_plain = req.body.password || req.body.employee_number

  const session = driver.session()

  hash_password(password_plain)
  .then(password_hashed => {

    const new_employee_properties = {
      password_hashed,
      email_address: req.body.email_address,
      employee_number: req.body.employee_number,
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      name: `${req.body.family_name} ${req.body.first_name}`,
      display_name: `${req.body.family_name} ${req.body.first_name}`,
    }

    const query = `
      // Merge by email_address since unique
      MERGE (employee:Employee:User {email_address:$properties.email_address})

      // Prevent duplicates
      WITH employee
      WHERE NOT EXISTS(employee.password_hashed)

      // Update the employee properties
      // += implies update of existing properties
      // DO NOT FORGET the '+'!
      SET employee += $properties

      RETURN employee
      `

    const parameters = {properties: new_employee_properties}

    return session.run(query, parameters)
  })
  .then(result => {

    if(records.length < 1) {
      console.log(`[Neo4J] Failed attempt at creating duplicate user ${req.body.email_address}`)
      return res.status(400).send(`User ${req.body.email_address} already exists`)
    }

    res.send(result.records[0].get('employee'))
    console.log(`[Neo4J] New employee created`)
  })
  .catch(error => {
    console.log(error)
    res.status(500).send(`Error updating user: ${error}`)
  })
  .finally( () => session.close())


}

exports.get_employee = (req, res) => {
  // Route to retrieve an employee's data

  // Retrieve employee ID
  // NOTE: Employee ID is NOT Employee number
  let employee_id = req.params.employee_id
  if(employee_id === 'self') employee_id = get_current_user_id(res)
  if(!employee_id) return res.status(400).send(`employee_id not defined`)

  const session = driver.session()
  session
  .run(`
    // Find the employee using the ID
    MATCH (employee:Employee)
    WHERE id(employee)=toInteger($employee_id)

    RETURN employee
    `, {
    employee_id,
  })
  .then( ({records}) => {

    if(!records.length) {
      console.log(`[Neo4J] User ${employee_id} not found`)
      return res.status(400).send(`User ${employee_id} not found`)
    }

    const employee = records[0].get('employee')
    delete employee.properties.password_hashed

    res.send(employee)

    console.log(`[Neo4J] Profile of user ${employee_id} queried`)
  })
  .catch(error => {
    console.error(error)
    res.status(400).send(`Error accessing DB: ${error}`)
  })
  .finally( () => { session.close() })
}

exports.get_employees = (req, res) => {
  // Route to retrieve employees

  const {search, ids, employee_numbers} = req.query

  let search_query = ''
  if(search) {
    search_query = `
    // Make a list of the keys of each node
    // Additionally, filter out fields that should not be searched
    WITH [key IN KEYS(employee) WHERE NOT key IN $exceptions] AS keys, employee

    // Unwinding
    UNWIND keys as key

    // Filter nodes by looking for properties
    WITH key, employee
    WHERE toLower(toString(employee[key])) CONTAINS toLower($search)
    `
  }

  let ids_query = ''
  if(ids) {
    search_query = `
    WITH employee
    UNWIND $ids as id
    WITH id, employee
    WHERE id(employee)=toInteger(id)
    `
  }

  let employee_numbers_query = ''
  if(employee_numbers) {
    search_query = `
    WITH employee
    UNWIND $employee_numbers as employee_number
    WITH employee_number, employee
    WHERE employee.employee_number=employee_number
    `
  }

  const query = `
    // Find the employee using the ID
    MATCH (employee:Employee)

    ${search_query}
    ${ids_query}

    RETURN DISTINCT employee

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

    const employees = records.map(record => record.get('employee'))
    employees.forEach( employee => { delete employee.properties.password_hashed })

    res.send( employees )
    console.log(`[Neo4J] Employees queried`)
   })
  .catch(error => {
    console.error(error)
    res.status(400).send(`Error accessing DB: ${error}`)
  })
  .finally( () => { session.close() })
}

exports.patch_employee = (req, res) => {

  const current_user_id = get_current_user_id(res)

  let employee_id = req.params.employee_id
    || req.params.user_id
    || req.params.id

  if(employee_id === 'self') employee_id = current_user_id

  if(!employee_id) {
    console.log(`Missing employee ID`)
    res.status(400).send(`Missing employee ID`)
  }

  // Prevent normal users to modify another user
  if(!res.locals.user.properties.isAdmin && user_id != current_user_id){
    return res.status(403).send(`Unauthorized to modify another user's data`)
  }

  let customizable_fields = [
    // Name related
    'display_name',
    'first_name',
    'family_name',
    'last_name', // Should not exist
    'name_kanji',
    'first_name_kanji',
    'family_name_kanji',
    'name_romaji',
    'first_name_romaji',
    'family_name_romaji',
    'name_katakana',
    'first_name_katakana',
    'family_name_katakana',
    'avatar_src',
  ]

  if(res.locals.user.properties.isAdmin) {
    customizable_fields= customizable_fields.concat([
      'isAdmin',
      'role',
      'locked',
      'employee_number',
    ])
  }


  // prevent user from modifying disallowed properties
  for (let [key, value] of Object.entries(req.body)) {
    if(!customizable_fields.includes(key)){
      console.log(`Attempt to modify forbidden key: ${key}`)
      return res.status(403).send(`Not allowed to modify property ${key}`)
    }
  }

  var session = driver.session()
  session
  .run(`
    // Find the user
    MATCH (employee:Employee)
    WHERE id(employee)=toInteger($employee_id)

    // Patch properties
    // += implies update of existing properties
    SET employee += $properties

    RETURN employee
    `, {
    employee_id,
    properties: req.body,
  })
  .then(({records}) => {

    if(records.length < 1) {
      console.log(`[Neo4J] User ${employee_id} not found`)
      return res.status(400).send(`User ${employee_id} not found`)
    }

    res.send( records[0].get('employee') )
    console.log(`User ${employee_id} patched`)
  })
  .catch(error => { res.status(500).send(`Error updating user: ${error}`) })
  .finally( () => session.close())

}




exports.delete_employee = (req, res) => {

  // Prevent normal users to create a user
  if(!res.locals.user.properties.isAdmin){
    console.log(`Unauthorized to create a user`)
    return res.status(403).send(`Unauthorized to create a user`)
  }

  const employee_id = req.params.employee_id

  if(!employee_id) {
    console.log(`Employee ID not defined`)
    return res.status(403).send(`Employee ID not defined`)
  }

  var session = driver.session()
  session
  .run(`
    // Merge by email_address since unique
    MATCH (employee:Employee:User)
    WHERE id(employee) = toInteger($employee_id)

    DETACH DELETE (employee)
    `, {
    employee_id,
  })
  .then(result => {
    res.send('OK')
    console.log(`Employee ${employee_id} deleted`)
  })
  .catch(error => {
    console.log(error)
    res.status(500).send(`Error updating user: ${error}`)
  })
  .finally( () => session.close())


}

exports.create_admin_if_not_exists = () => {

  const default_admin_password = process.env.DEFAULT_ADMIN_PASSWORD
    || 'administrator'

  const session = driver.session()

  hash_password(default_admin_password)
  .then(default_admin_password_hashed => {
    return session.run(`
      // Create a dummy node so that the administrator account does not get ID 0
      MERGE (dummy:DummyNode)

      // Find the administrator account or create it if it does not exist
      MERGE (administrator:User:Employee {username:"administrator"})

      // Make the administrator an actual administrator
      SET administrator.isAdmin = true

      // Check if the administrator account is missing its password
      // If the administrator account does not have a password (newly created), set it
      WITH administrator
      WHERE NOT EXISTS(administrator.password_hashed)
      SET administrator.password_hashed = $default_admin_password_hashed

      // Set some additional properties
      SET administrator.display_name = 'Administrator'

      // Return the account
      RETURN 'OK'
      `, { default_admin_password_hashed })
  })
  .then(({records}) => {
    if(records.length > 0) console.log(`[Neo4J] Admin creation: admin account created`)
    else console.log(`[Neo4J] Admin creation: admin already existed`)
  })
  .catch(error => { console.log(error) })
  .finally( () => session.close())
}


exports.get_employees_of_group = (req, res) => {
  // Route to retrieve an employee's data

  // Retrieve employee ID
  let {group_id} = req.params

  const session = driver.session()
  session
  .run(`
    // Find the employee using the ID
    MATCH (group:Group)<-[:BELONGS_TO]-(employee:Employee)
    WHERE id(group)=toInteger($group_id)

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
