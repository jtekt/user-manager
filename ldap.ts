import { authenticate } from "ldap-authentication"

const { LDAP_HOSTNAME, LDAP_SEARCH_OU, LDAP_USERNAME, LDAP_PASSWORD } =
  process.env

export const authenticateWithLdap = async (
  email_address: string,
  password: string
) => {
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
  } catch (error: any) {
    console.log(error)
    return false
  }
}

export const hostname = LDAP_HOSTNAME
