const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')


exports.error_handling = (error, res) => {
  const {tag} = error
  let status_code = error.code || 500
  const message = error.message || error
  if(isNaN(status_code)) status_code = 500
  res.status(status_code).send(message)
  console.log(message)
}

const get_id_of_user = (user) => {
  return user._id
    ?? user.properties._id
    ?? user.identity.low
    ?? user.identity
}

exports.get_id_of_user = get_id_of_user

exports.get_current_user_id = (res) => {
  const user = res.locals.user
  return get_id_of_user(user)
}

const user_id_filter = ` WHERE user._id = $user_id `
exports.user_id_filter = user_id_filter
exports.user_query = ` MATCH (user:User) ${user_id_filter}`

exports.hash_password = (password_plain) => bcrypt.hash(password_plain, 10)
exports.compare_password = (password_plain, password_hashed) => bcrypt.compare(password_plain, password_hashed)


exports.generate_token = (user) => new Promise( (resolve, reject) => {

  const JWT_SECRET = process.env.JWT_SECRET
  if(!JWT_SECRET) return reject({code: 500, message: `Token secret not set`})

  const user_id = get_id_of_user(user)
  const token_content = { user_id }

  jwt.sign(token_content, JWT_SECRET, (error, token) => {
    if(error) return reject({code: 500, message: error})
    resolve(token)
  })
})

exports.decode_token = (token) => new Promise ( (resolve, reject) => {

  const JWT_SECRET = process.env.JWT_SECRET
  if(!JWT_SECRET) return reject({code: 500, message: `Token secret not set`})

  jwt.verify(token, JWT_SECRET, (error, decoded_token) => {
    if(error) return reject({code: 403, message: `Invalid JWT`})
    resolve(decoded_token)
  })
})
