import { driver } from "../db"

const session = driver.session()

const query = `
  MATCH (u:User)
  WHERE NOT EXISTS(u._id)
  SET u._id = toString(id(u))
  RETURN count(u) as count
  `

session
  .run(query)
  .then(({ records }: any) => {
    const count = records[0].get("count")
    console.log({ count })
  })
  .catch((error: any) => {
    console.log(error)
  })
  .finally(() => {
    session.close()
  })
