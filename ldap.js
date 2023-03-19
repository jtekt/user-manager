const dotenv = require("dotenv")
const { authenticate } = require("ldap-authentication")

dotenv.config()

const { LDAP_HOSTNAME, LDAP_SEARCH_OU, LDAP_USERNAME, LDAP_PASSWORD } =
  process.env

const authenticateWithLdap = async (email_address, password) => {
  const options = {
    ldapOpts: { url: `ldap://${LDAP_HOSTNAME}` },
    adminDn: LDAP_USERNAME,
    adminPassword: LDAP_PASSWORD,
    userSearchBase: LDAP_SEARCH_OU,
    usernameAttribute: "mail",
    username: email_address,
    userPassword: password,
  }

  try {
    await authenticate(options)
    return true
  } catch (error) {
    return false
  }
}

exports.hostname = LDAP_HOSTNAME
exports.authenticateWithLdap = authenticateWithLdap
