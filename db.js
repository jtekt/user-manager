const neo4j = require('neo4j-driver')
const dotenv = require('dotenv')

dotenv.config()

const {
  NEO4J_URL = 'bolt://neo4j',
  NEO4J_USERNAME = 'neo4j',
  NEO4J_PASSWORD = 'neo4j',
} = process.env

const auth = neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)

const options = {
  v1: {},
  v2: { disableLosslessIntegers: true }
}

exports.url = NEO4J_URL
exports.drivers = {
  v1: neo4j.driver(NEO4J_URL, auth, options.v1),
  v2: neo4j.driver(NEO4J_URL, auth, options.v2)
}
