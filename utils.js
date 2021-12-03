const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')


exports.error_handling = (error, res) => {
  const {tag} = error
  const status_code = error.code || 500
  const message = error.message || error
  res.status(status_code).send(message)
  console.log(message)
}


exports.get_current_user_id = (res) => {
  return res.locals.user.identity.low
    ?? res.locals.user.identity
}

exports.hash_password = (password_plain) => bcrypt.hash(password_plain, 10)
exports.compare_password = (password_plain, password_hashed) => bcrypt.compare(password_plain, password_hashed)


exports.generate_token = (user) => new Promise( (resolve, reject) => {

  const JWT_SECRET = process.env.JWT_SECRET
  if(!JWT_SECRET) return reject({code: 500, message: `Token secret not set`})

  const token_content = { user_id: user.identity }

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
