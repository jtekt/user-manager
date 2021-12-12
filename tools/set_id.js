const {drivers: {v2: driver}} = require('../db.js')

const session = driver.session()

const query = `
  MATCH (u:User)
  WHERE NOT EXISTS(u._id)
  SET u._id = toString(id(u))
  RETURN count(u) as count
  `

session.run(query)
.then( ({records}) => {
  const count = records[0].get('count')
  console.log({count})
})
.catch( (error) => {
  console.log(error)
})
.finally(() => {
  session.close()
})
