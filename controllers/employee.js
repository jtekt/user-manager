const driver = require('../neo4j_driver.js')
const bcrypt = require('bcrypt')

function get_current_user_id(res){
  return res.locals.user.identity.low
    ?? res.locals.user.identity
}

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

  // Adding properties
  req.body.name = `${req.body.family_name} ${req.body.first_name}`
  req.body.display_name = `${req.body.family_name} ${req.body.first_name}`

  const passsword_plain = req.body.password || req.body.employee_number

  bcrypt.hash(req.body.employee_number, 10, (error, hash) => {

    // Handle hashing errors
    if(error) {
      console.log(error)
      return res.status(500).send(`Error hashing password: ${error}`)
    }

    // save the hashed password as an employee property
    req.body.password_hashed = hash

    // Delete password if it was sent in the body
    delete req.body.password

    var session = driver.session()
    session
    .run(`
      // Merge by email_address since unique
      MERGE (employee:Employee:User {email_address:$properties.email_address})

      // Update the employee properties
      // += implies update of existing properties
      // DO NOT FORGET the '+'!
      SET employee += $properties

      RETURN employee
      `, {
      properties: req.body,
    })
    .then(result => {
      res.send(result.records[0].get('employee'))
      console.log(`Employee ${req.body.display_name} created`)
    })
    .catch(error => {
      console.log(error)
      res.status(500).send(`Error updating user: ${error}`)
    })
    .finally( () => session.close())

  })

}

exports.get_employee = (req, res) => {
  // Route to retrieve an employee's data

  // Retrieve employee ID
  let employee_id = req.params.employee_id
    || req.query.id
    || req.query.user_id
    || req.query.employee_id
    || get_current_user_id(res)

  if(employee_id === 'self') employee_id =  get_current_user_id(res)

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
  .then(result => {
    const user_id = JSON.stringify(result.records[0]._fields[result.records[0]._fieldLookup.employee].identity)
    console.log(`Profile of user ${user_id} queried`)
    res.send(result.records)
  })
  .catch(error => {
    console.error(error)
    res.status(400).send(`Error accessing DB: ${error}`)
  })
  .finally( () => { session.close() })
}

exports.get_all_employees = (req, res) => {
  // Route to retrieve all employees

  // TODO: Manage limits better

  const session = driver.session()
  session
  .run(`
    // Find the employee using the ID
    MATCH (employee:Employee)

    RETURN employee

    LIMIT 100

    `, {})
  .then(result => { res.send(result.records) })
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

  console.log(req.body)

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
  .then(result => {
    res.send(result.records)
    console.log(`User ${employee_id} patched`)
  })
  .catch(error => { res.status(500).send(`Error updating user: ${error}`) })
  .finally( () => session.close())

}

exports.update_password = (req, res) => {

  // Input sanitation
  if(!req.body.new_password) return res.status(400).send(`New nassword missing`)
  if(!req.body.new_password_confirm) return res.status(400).send(`New password confirm missing`)

  // Get current user ID
  const current_user_id = get_current_user_id(res)

  // Retrieve user ID
  let employee_id = req.params.employee_id
  if(employee_id === 'self') employee_id = current_user_id

  // Prevent an user from modifying another's password
  if(employee_id !== current_user_id && !res.locals.user.properties.isAdmin) {
    return res.status(403).send(`Unauthorized to modify another user's password`)
  }

  // Only allow admins to set password without checking the current password
  if(!res.locals.user.properties.isAdmin && !req.body.current_password) {
    return res.status(400).send(`Current password missing`)
  }


  const rx_session = driver.session()
  rx_session.run(`
    // Find the user using ID
    MATCH (employee:Employee)
    WHERE id(employee) = toInteger($employee_id)

    // Return employee once done
    RETURN employee.password_hashed as password
    `, {
      employee_id: employee_id,
    })
  .then(result => {
    let current_password_hashed = result.records[0].get('password')
    bcrypt.compare(req.body.current_password, current_password_hashed, (err, result) => {
      // Current password must be correct for non-admins
      if(!res.locals.user.properties.isAdmin){
        if(err) return res.status(500).send('Error verifying current password')
        if(!result) return res.status(403).send('Wrong current password')
      }

      // Hash the provided new password
      bcrypt.hash(req.body.new_password, 10, (err, hash) => {
        if(err) return res.status(500).send(`Error hashing password: ${err}`)

        const tx_session = driver.session()
        tx_session.run(`
          // Find the user using ID
          MATCH (employee:Employee)
          WHERE id(employee) = toInteger($employee_id)

          // Set the new password
          SET employee.password_hashed = $new_password_hashed
          SEt employee.password_changed = true

          // Return employee once done
          RETURN employee
          `, {
            employee_id: employee_id,
            new_password_hashed: hash
          })
        .then(result => { res.send(result.records) })
        .catch(error => res.status(400).send(`Error accessing DB: ${error}`))
        .finally( () => tx_session.close())
      })



    })

  })
  .catch(error => res.status(400).send(`Error accessing DB: ${error}`))
  .finally( () => rx_session.close())

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
    WITH [key IN KEYS(employee) WHERE NOT key IN $exceptions] AS keys, employee

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
    MERGE (employee:Employee:User)
    WHERE id(employee) = toInteger($employee_id)

    DETACH DELETE (employee)
    `, {
    $employee_id: employee_id,
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

  let default_admin_password = process.env.DEFAULT_ADMIN_PASSWORD
    || 'administrator'

  bcrypt.hash(default_admin_password, 10, (err, hash) => {
    if(err) return res.status(500).send(`Error hashing password: ${err}`)

    const session = driver.session();
    session
    .run(`

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
      `, {
        default_admin_password_hashed: hash
      })
      .then(result => {
        if(result.records.length > 0) {
          console.log(`Admin creation: admin account created`)
        }
        else {
          console.log(`Admin creation: admin already existed`)
        }

      })
      .catch(error => {
        console.log(error)
      })
      .finally( () => session.close())
  })
}
