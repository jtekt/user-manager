const bcrypt = require('bcrypt')
const createHttpError = require('http-errors')
const { drivers: {v2: driver} } = require('../../db.js')
const { passwordUpdateSchema } = require('../../schemas/passwords.js')
const { send_password_reset_email } = require('../../mail.js')
const { hash_password } = require('../../utils/passwords.js')
const {
  get_current_user_id,
  user_query,
} = require('../../utils/users.js')

exports.update_password = async (req, res, next) => {



  const session = driver.session()

  try {

    // Get current user ID
    const current_user_id = get_current_user_id(res)
    const user_is_admin = res.locals.user.isAdmin

    // Input parsing
    let {user_id} = req.params

    if(user_id === 'self') user_id = current_user_id
    if(!user_id) throw createHttpError(400, `Missing user ID`)

    // Prevent an user from modifying another's password
    if(String(user_id) !== String(current_user_id) && !user_is_admin) {
      throw createHttpError(403, `Unauthorized to modify another user's password`)
    }

    try {
      await passwordUpdateSchema.validateAsync(req.body)
    }
    catch (error) {
      throw createHttpError(400, error.message)
    }

    const {new_password, new_password_confirm} = req.body


    const password_hashed = await hash_password(new_password)

    const query = `
      ${user_query}
      SET user.password_hashed = $password_hashed
      SET user.password_changed = true
      RETURN properties(user) as user
      `



    const {records} = await session.run(query, { user_id, password_hashed })
    if(!records.length) throw createHttpError(404, `User ${user_id} not found`)
    // NEED TO REMOVE PASSWORD HASHED FROM RESPONSE

    res.send( records[0].get('user') )
    console.log(`[Neo4J] Password of user ${user_id} updated`)

  }
  catch (error) {
    next(error)
  }
  finally {
    session.close()
  }

}

exports.request_password_reset = async (req, res, next) => {

  const session = driver.session()

  const {
    PASSWORD_RESET_URL: url = req.headers.origin
  } = process.env

  try {
    const {email_address} = req.body
    if(!email_address) throw createHttpError(400, `Missing email address`)

    const query = `
      MATCH (user:User)
      WHERE user.email_address = $email_address
      RETURN properties(user) as user
      `
    const {records} = await session.run(query, { email_address })
    if(!records.length) throw createHttpError(400, `User not found`)

    const user = records[0].get('user')

    const mail_options = {url, user}
    await send_password_reset_email(mail_options)

    res.send({email_address})
  }
  catch (error) {
    next(error)
  }
  finally {
    session.close()
  }


}
