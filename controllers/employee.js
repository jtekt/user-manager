const driver = require('../neo4j_driver.js')
const bcrypt = require('bcrypt')


exports.get_employee = (req, res) => {
  // Route to retrieve an employee's data

  // Retrieve employee ID
  let employee_id = req.params.employee_id
    || req.query.id
    || req.query.user_id
    || req.query.employee_id
    || res.locals.user.identity.low

  if(employee_id === 'self') employee_id = res.locals.user.identity.low

  const session = driver.session();
  session
  .run(`
    // Find the employee using the ID
    MATCH (employee:Employee)
    WHERE id(employee)=toInteger($employee_id)

    RETURN employee
    `, {
    employee_id: employee_id,
  })
  .then(result => { res.send(result.records) })
  .catch(error => {
    console.error(error)
    res.status(400).send(`Error accessing DB: ${error}`)
  })
  .finally( () => { session.close() })
}

exports.patch_employee = (req, res) => {

  let current_user_id = res.locals.user.identity.low

  let user_id = req.params.employee_id
    || req.params.user_id
    || req.params.id

  // Prevent normal users to modify another user
  if(!res.locals.user.properties.isAdmin){
    if(user_id !== current_user_id) {
      return res.status(403).send(`Unauthorized to modify another user's data`)
    }
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
    // Misc
    'avatar_src',
    // for 行先掲示板
    'presence',
    'current_location',
  ]

  // prevent user from modifying disallowed properties
  for (let [key, value] of Object.entries(req.body)) {
    if(!customizable_fields.includes(key)) delete req.body[key]
  }

  var session = driver.session()
  session
  .run(`
    // Find the group
    MATCH (employee:Employee)
    WHERE id(employee)=toInteger($employee_id)

    // Patch properties
    // += implies update of existing properties
    SET employee += $properties

    RETURN employee
    `, {
    employee_id: user_id,
    properties: req.body,
  })
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(500).send(`Error updating group: ${error}`) })
  .finally( () => session.close())

}

exports.update_password = (req, res) => {

  // Input sanitation
  if(!('new_password' in req.body)) {
    return res.status(400).send(`Password missing from body`)
  }

  // get the ID of the current user
  let current_user_id = res.locals.user.identity.low

  // Retrieve user ID
  let employee_id = req.params.employee_id
  if(employee_id === 'self') employee_id = current_user_id

  // Prevent an user from modifying another's password
  if(employee_id !== current_user_id && !res.locals.user.properties.isAdmin) {
    return res.status(403).send(`Unauthorized to modify another user's password`)
  }

  // Hash the provided password
  bcrypt.hash(req.body.new_password, 10, (err, hash) => {
    if(err) return res.status(500).send(`Error hashing password: ${err}`)

    const session = driver.session();
    session
    .run(`
      // Find the user using ID
      MATCH (employee:Employee)
      WHERE id(employee) = toInteger($employee_id)

      // Set the new password
      SET employee.password_hashed = $new_password_hashed

      // Return employee once done
      RETURN employee
      `, {
        employee_id: employee_id,
        new_password_hashed: hash
      })
      .then(result => { res.send(result.records) })
      .catch(error => res.status(400).send(`Error accessing DB: ${error}`))
      .finally( () => session.close())
  })
}


exports.find_employee = (req, res) => {
  // Finding an employee using whichever of his properties

  const session = driver.session();
  session
  .run(`
    // Match all employees
    MATCH (employee:Employee)

    // Make a list of the keys of each node
    // Additionally, filter out fields that should not be searched
    WITH [key IN KEYS(employee) WHERE NOT key IN {exceptions}] AS keys, employee

    // Unwinding
    UNWIND keys as key

    // Filter nodes by looking for properties
    WITH key, employee
    WHERE toLower(toString(employee[key])) CONTAINS toLower($query)

    RETURN DISTINCT employee
    LIMIT 100
    `,
    {
      query: req.query.query,
      exceptions: [
        'password_hashed'
      ]
    })
  .then(result => { res.send(result.records) })
  .catch(error => {
    console.log(error)
    res.status(400).send(`Error accessing DB: ${error}`)
  })
  .finally( () => { session.close() })
}


exports.create_admin_if_not_exists = () => {

  let default_admin_password = process.env.DEFAULT_ADMIN_PASSWORD
    || 'administrator'

  bcrypt.hash(default_admin_password, 10, (err, hash) => {
    if(err) return res.status(500).send(`Error hashing password: ${err}`)

    const session = driver.session();
    session
    .run(`
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
      `, {
        default_admin_password_hashed: hash
      })
      .then(result => {
        if(result.records.length > 0) {
          console.log(`Administrator account created`)
        }
        else {
          console.log(`Administrator already existed`)
        }

      })
      .catch(error => { console.log(error)})
      .finally( () => session.close())
  })
}
