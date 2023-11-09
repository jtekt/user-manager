import { drivers } from "../../db"
import { get_current_user_id, user_query } from "../../utils/users"
const driver = drivers.v1

export const get_employee = (
  req: request,
  res: response,
  next: nextfunction
) => {
  // Route to retrieve an employee's data

  // Retrieve employee ID
  let user_id = req.params.employee_id
  if (user_id === "self") user_id = get_current_user_id(res)
  if (!user_id) return res.status(400).send(`employee_id not defined`)

  const session = driver.session()

  const query = `
    ${user_query}
    RETURN user
    `

  session
    .run(query, { user_id })
    .then(({ records }: any) => {
      if (!records.length) {
        console.log(`[Neo4J] User ${user_id} not found`)
        return res.status(400).send(`User ${user_id} not found`)
      }
      console.log(`[Neo4J] Profile of user ${user_id} queried`)
      res.send(records)
    })
    .catch(next)
    .finally(() => {
      session.close()
    })
}

export const get_employees = (
  req: request,
  res: response,
  next: nextfunction
) => {
  // Route to retrieve employees

  let search_query = ""
  if (req.query.search) {
    search_query = `
    // Make a list of the keys of each node
    // Additionally, filter out fields that should not be searched
    WITH [key IN KEYS(employee) WHERE NOT key IN $exceptions] AS keys, employee

    // Unwinding
    UNWIND keys as key

    // Filter nodes by looking for properties
    WITH key, employee
    WHERE toLower(toString(employee[key])) CONTAINS toLower($search)
    `
  }

  let ids_query = ""
  if (req.query.ids) {
    search_query = `
    WITH employee
    UNWIND $ids as id
    WITH id, employee
    //WHERE id(employee)=toInteger(id)
    WHERE employee._id = id
    `
  }

  const session = driver.session()
  session
    .run(
      `
    // Find the employee using the ID
    MATCH (employee)
    WHERE employee:Employee OR employee:User


    ${search_query}
    ${ids_query}

    RETURN DISTINCT employee

    LIMIT 100
    `,
      {
        search: req.query.search,
        exceptions: ["password_hashed"],
        ids: req.query.ids,
      }
    )
    .then(({ records }: any) => {
      const employees = records.map((record: any) => record.get("employee"))
      res.send(employees)
    })
    .catch(next)
    .finally(() => {
      session.close()
    })
}
