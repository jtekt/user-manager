const driver = require('../neo4j_driver.js')
const bcrypt = require('bcrypt')


function get_employee_id_for_viewing(req, res){
  if('employee_id' in req.body) return req.body.employee_id
  if('employee_id' in req.query) return req.query.employee_id

  if('user_id' in req.body) return req.body.user_id
  if('user_id' in req.query) return req.query.user_id

  // if nothing, just use the logged in user
  return res.locals.user.identity.low
}

function get_employee_id_for_modification(req, res){

  // If not requiring particular employee, just return self
  if(! ('employee_id' in req.body)) return res.locals.user.identity.low

  if(res.locals.user.identity.low !== req.body.employee_id) {
    // Does not get gaught by Neo4j catch!
    res.status(403).send(`Cannot edit someone else's info`)
    throw "Cannot edit someone else's info"
  }
  else return eq.body.employee_id

}


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
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
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
        employee_id: get_employee_id_for_modification(req, res),
        new_password_hashed: hash
      })
      .then(result => { res.send(result.records) })
      .catch(error => res.status(400).send(`Error accessing DB: ${error}`))
      .finally( () => session.close())
  })
}
