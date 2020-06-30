const driver = require('../neo4j_driver.js')
const bcrypt = require('bcrypt')


exports.get_employee = (req, res) => {
  // Route to retrieve an employee's data

  // Retrieve employee ID
  let employee_id = req.params.employee_id
    || req.query.id
    || req.query.user_id
    || req.query.employee_id
    || req.body.id
    || req.body.user_id
    || req.body.employee_id
    || res.locals.user.identity.low

  if(employee_id === 'self') employee_id = res.locals.user.identity.low

  const session = driver.session();
  session
  .run(`
    // Find the employee using the ID
    MATCH (employee:Employee)
    WHERE id(employee)=toInt({employee_id})

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
    'display_name',
    'first_name',
    'last_name',
    'name_kanji',
    'name_romaji',
    'first_name_kanji',
    'family_name_kanji',
    'first_name_romaji',
    'family_name_romaji',
    'avatar_src',
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
    WHERE id(employee)=toInt({employee_id})

    // Patch properties
    // += implies update of existing properties
    SET employee += {properties}

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
      WHERE id(employee) = toInt({employee_id})

      // Set the new password
      SET employee.password_hashed={new_password_hashed}

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
