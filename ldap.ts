import { authenticate } from "ldap-authentication"

export const {
  LDAP_HOSTNAME,
  LDAP_SEARCH_OU,
  LDAP_USERNAME,
  LDAP_PASSWORD,
  LDAP_USERNAME_ATTRIBUTE = "mail",
} = process.env

export const authenticateWithLdap = async (
  username: string,
  userPassword: string
) => {
  if (!LDAP_HOSTNAME) return false

  const options = {
    ldapOpts: { url: `ldap://${LDAP_HOSTNAME}` },
    adminDn: LDAP_USERNAME,
    adminPassword: LDAP_PASSWORD,
    userSearchBase: LDAP_SEARCH_OU,
    usernameAttribute: LDAP_USERNAME_ATTRIBUTE,
    username,
    userPassword,
  }

  try {
    await authenticate(options)
    return true
  } catch (error: any) {
    console.log(error)
    console.log(error.admin)
    return false
  }
}

export const hostname = LDAP_HOSTNAME
