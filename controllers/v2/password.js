const bcrypt = require('bcrypt')
const {drivers: {v2: driver}} = require('../../db.js')
const {
  send_password_reset_email,
} = require('../../mail.js')
const {
  get_current_user_id,
  hash_password,
  compare_password,
  generate_token
} = require('../../utils.js')


exports.update_password = async (req, res) => {

  // Input parsing
  const {new_password, new_password_confirm} = req.body

  if(!new_password) return res.status(400).send(`New nassword missing`)
  if(!new_password_confirm) return res.status(400).send(`New password confirm missing`)

  // Get current user ID
  const current_user_id = get_current_user_id(res)
  const user_is_admin = res.locals.user.properties.isAdmin

  // Retrieve user ID
  let {employee_id} = req.params
  if(employee_id === 'self') employee_id = current_user_id
  if(!employee_id) employee_id = current_user_id

  // Prevent an user from modifying another's password
  if(String(employee_id) !== String(current_user_id) && !user_is_admin) {
    return res.status(403).send(`Unauthorized to modify another user's password`)
  }

  const session = driver.session()

  try {

    const user_query = `
      MATCH (employee:Employee)
      WHERE id(employee) = toInteger($employee_id)
      RETURN employee.password_hashed as password
      `

    const {records: user_records} = await session.run(user_query, { employee_id })
    if(!user_records.length) throw 'Employee not found'

    const password_hashed = await hash_password(new_password)

    const password_update_query = `
      // Find the user using ID
      MATCH (employee:Employee)
      WHERE id(employee) = toInteger($employee_id)

      // Set the new password
      SET employee.password_hashed = $password_hashed
      SEt employee.password_changed = true

      RETURN employee
      `

    const {records} = await session.run(password_update_query, { employee_id, password_hashed })
    if(!records.length) throw 'Password update failed'

    res.send( records[0].get('employee') )
    console.log(`[Neo4J] Password of user ${employee_id} updated`)

  }
  catch (error) {
    console.log(error)
    res.status(500).send(error)
  }
  finally {
    session.close()
  }

}

exports.request_password_reset = async (req, res) => {

  const session = driver.session()

  const {
    PASSWORD_RESET_URL: url = req.headers.origin
  } = process.env

  try {
    const {email_address} = req.body
    if(!email_address) throw 'Missing email address'

    const query = `
      MATCH (user:User)
      WHERE user.email_address = $email_address
      RETURN user
      `
    const {records} = await session.run(query, { email_address })
    if(!records.length) throw 'User does not seem to exist'

    const user = records[0].get('user')

    const mail_options = {url, user}
    await send_password_reset_email(mail_options)

    res.send({reset_url})
  }
  catch (e) {
    console.log(e)
    res.status(500).send(e)

  }
  finally {
    session.close()
  }


}
