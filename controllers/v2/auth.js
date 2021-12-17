const Cookies = require('cookies')
const {drivers: {v2: driver}} = require('../../db.js')
const {
  decode_token,
  generate_token,
  compare_password,
  error_handling,
  get_id_of_user,
  user_query
} = require('../../utils.js')


const retrieve_jwt = (req, res) => new Promise( (resolve, reject) => {

  // Did not have to be a promise

  const jwt = req.headers.authorization?.split(" ")[1]
    || req.headers.authorization
    || (new Cookies(req, res)).get('jwt')
    || (new Cookies(req, res)).get('token')
    || req.query.jwt
    || req.query.token

  if(!jwt) return reject(`JWT not provided`)

  resolve(jwt)
})

const register_last_login = async (user) => {

  const session = driver.session()

  try {
    const user_id = get_id_of_user(user)
    const query = `
      ${user_query}
      SET user.last_login = date()
      RETURN user
      `
    await session.run(query, {user_id})
  }
  catch (error) {
    throw error
  }
  finally {
    session.close()
  }

}


const find_user_in_db = (identifier) => new Promise ( (resolve, reject) => {
  // The error management here is quite bad
  const session = driver.session()

  const query = `
    MATCH (user:User)

    // Allow user to identify using either userrname or email address
    WHERE user.email_address = $identifier
      OR user.username = $identifier
      OR user._id = $identifier
      //OR id(user) = toInteger($identifier) // <= REMOVED!!

    // Return user if found
    RETURN DISTINCT(user)
    `

  session.run(query, { identifier })
  .then( ({records}) => {

    if(!records.length) return reject({code: 403, message: `User ${identifier} not found`, tag: 'Neo4J'})
    if(records.length > 1) return reject({code: 500, message: `Multiple users identitfied as ${identifier} found`, tag: 'Neo4J'})

    const user = records[0].get('user')

    console.log(`[Neo4j] User ${identifier} successfully found in the DB`)

    resolve(user)
  })
  .catch(error => { reject({code: 500, message:error}) })
  .finally( () => session.close())

})




exports.middleware = async (req, res, next) => {

  const session = driver.session()

  try {
    const token = await retrieve_jwt(req, res)
    const {user_id} = await decode_token(token)

    const query = `${user_query} RETURN user`
    
    const params = {user_id: user_id.toString()} // Forcing string
    const {records} = await session.run(query, params)

    if(!records.length) throw `[Neo4J] User ${user_id} not found in the database`
    if(records.length > 1) throw `Multiple users with ID ${user_id} found in the database`

    const user = records[0].get('user')

    // save user in res locasl so that it can use in other places
    res.locals.user = user

    next()
  }
  catch (error) {
    console.log(error)
    res.status(403).send(error)
  }
  finally {
    session.close()
  }

}

exports.login = async (req, res) => {

  try {

    // Input management
    const identifier = req.body.username
      || req.body.email_address
      || req.body.email
      || req.body.identifier

    const {password} = req.body

    if(!identifier) throw {code: 400, message: `Missing username or e-mail address`}
    if(!password) throw {code: 400, message: `Missing password`}

    console.log(`[Auth] Login attempt from user identified as ${identifier}`)

    // User query
    const user = await find_user_in_db(identifier)

    // Lock check
    if(user.properties.locked) throw {code: 403, message: `This account is locked`}

    // Password check
    const password_correct = await compare_password(password, user.properties.password_hashed)
    if(!password_correct) throw {code: 403, message: `Incorrect password`}

    await register_last_login(user)

    const jwt = await generate_token(user)

    res.send({jwt,user})

    console.log(`[Auth v2] Successful login from user identified as ${identifier}`)
  }
  catch (error) {
    error_handling(error, res)
  }

}
