const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const history = require('connect-history-api-fallback');
const axios = require('axios')
const neo4j = require('neo4j-driver').v1

const secrets = require('./secrets');


const app_port = 8097;

process.env.TZ = 'Asia/Tokyo';

var driver = neo4j.driver(
  secrets.neo4j.url,
  neo4j.auth.basic(secrets.neo4j.username, secrets.neo4j.password)
)

var app = express()
app.use(history())
app.use(bodyParser.json())
app.use(cors())
// Serving front end
app.use(express.static(path.join(__dirname, 'dist')));


// Todo: replace by middleware
function check_authentication(req, res, next){

  let token = req.headers.authorization.split(" ")[1];
  if(!token) return res.status(400).send(`No token in authorization header`)

  axios.post(secrets.authentication_api_url, { jwt: token })
  .then(response => {
    res.locals.user = response.data
    next()
  })
  .catch(error => { res.status(400).send(error) })

}


app.post('/get_employee', check_authentication, (req, res) => {
  // Route to retrieve an employee's data
  // if employee number not specified, return one's own

  if(!('employee_number' in req.body)) return res.send(res.locals.user)
  const session = driver.session();
  session
  .run(`
    MATCH (employee:Employee {employee_number:{employee_number}})
    RETURN employee
    `,
    {
      employee_number: req.body.employee_number,
    })
  .then(result => { res.send(result.records[0].get('employee')) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })


});

app.post('/get_all_nodes_related_to_employee', check_authentication, (req, res) => {
  // Route to retrieve nodes related to one employee
  // WARNING: Might respond with a lot of data

  var employee_number = undefined;
  if('employee_number' in req.body) employee_number = req.body.employee_number
  else employee_number = res.locals.user.properties.employee_number

  const session = driver.session();
  session
  .run(`
    MATCH (employee:Employee {employee_number:{employee_number}})
    WITH employee
    MATCH (related_node)--(employee)
    RETURN related_node
    `,
    {
      employee_number: employee_number,
    })
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
});


app.post('/get_groups_of_employee', check_authentication, (req, res) => {
  // Route to retrieve a user's groups

  var employee_number = undefined;
  if('employee_number' in req.body) employee_number = req.body.employee_number
  else employee_number = res.locals.user.properties.employee_number

  const session = driver.session();
  session
  .run(`
    MATCH (employee:Employee {employee_number:{employee_number}})-[:BELONGS_TO]->(group)
    RETURN group
    `,
    {
      employee_number: employee_number,
    })
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
})


app.post('/get_workplaces_of_employee', check_authentication, (req, res) => {
  // Route to retrieve a user's workplaces
  // here it is assumed that an employee can have multiple workplaces

  var employee_number = undefined;
  if('employee_number' in req.body) employee_number = req.body.employee_number
  else employee_number = res.locals.user.properties.employee_number

  const session = driver.session();
  session
  .run(`
    MATCH (employee:Employee {employee_number:{employee_number}})-[:WORKS_IN]->(workplace:Workplace)
    RETURN workplace
    `,
    {
      employee_number: employee_number,
    })
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
});

app.post('/join_workplace', check_authentication, (req, res) => {
  // Route to join a workplace

  // TODO: PREVENT OTHER USERS FROM CHANGING ONE'S WORKPLACE

  var employee_number = undefined;
  if('employee_number' in req.body) employee_number = req.body.employee_number
  else employee_number = res.locals.user.properties.employee_number

  const session = driver.session();
  session
  .run(`
    // Find the employee
    MATCH (employee:Employee {employee_number:{employee_number}})

    // Find the workplace
    WITH employee
    MATCH (workplace:Workplace)
    WHERE id(workplace)=toInt({workplace_id})

    // MERGE relationship
    MERGE (employee)-[:WORKS_IN]->(workplace)

    // Return
    RETURN employee, workplace
    `,
    {
      employee_number: employee_number,
      workplace_id: req.body.workplace_id
    })
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
})

app.post('/leave_workplace', check_authentication, (req, res) => {
  // Route to retrieve a user's workplaces
  // here it is assumed that an employee can have multiple workplaces

  var employee_number = undefined;
  if('employee_number' in req.body) employee_number = req.body.employee_number
  else employee_number = res.locals.user.properties.employee_number

  const session = driver.session();
  session
  .run(`
    // Find the employee and the workplace
    MATCH (employee:Employee)-[r:WORKS_IN]->(workplace:Workplace)
    WHERE employee.employee_number = {employee_number} AND id(workplace)=toInt({workplace_id})

    // delete relationship
    DELETE r

    // Return
    RETURN employee
    `,
    {
      employee_number: employee_number,
      workplace_id: req.body.workplace_id
    })
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
})

app.post('/get_highest_hierarchy_groups', (req, res) => {
  // Route to retrieve the top level groups (i.e. groups that don't belong to any other group)
  const session = driver.session();
  session
  .run(`
    // TODO: Would be nice to specify label of node
    MATCH (group)<-[:BELONGS_TO]-()
    WHERE NOT (group)-[:BELONGS_TO]->()

    // NOT SURE WHY DISTINCT NEEDED
    RETURN DISTINCT(group)
    `,
    {})
  .then(result => { res.send(result.records); })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
});


app.post('/get_groups_directly_belonging_to_group', (req, res) => {
  // THIS IS THE NEW ONE
  // Route to retrieve the top level groups (i.e. groups that don't belong to any other group)
  const session = driver.session();
  session
  .run(`
    // Match the parent node
    MATCH (parent_group)
    WHERE ID(parent_group)={node_id}

    // Match children that only have a direct connection to parent
    WITH parent_group
    MATCH (parent_group)<-[:BELONGS_TO]-(group)
    WHERE NOT group:Employee AND NOT (group)-[:BELONGS_TO]->()-[:BELONGS_TO]->(parent_group)

    // DISTINCT JUST IN CASE
    RETURN DISTINCT(group)
    `,
    {
      node_id: req.body.node_id
    })
  .then(result => { res.send(result.records); })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
});


app.post('/personal_information_v2', check_authentication, (req, res) => {
  // Route to retrive the information of the user currently logged in
  // STILL NOT IDEAL AS SOME NODES MIGHT BECOME USEFUL IN THE FUTURE

  // REMOVE THIS AS SOON AS POSSIBLE

  const session = driver.session();
  session
  .run(`
    MATCH (employee:Employee {employee_number:{employee_number}})
    WITH employee
    OPTIONAL MATCH (employee)-[:WORKS_IN]->(workplace:Workplace)
    OPTIONAL MATCH (employee)-[:BELONGS_TO]->(division:Division)
    OPTIONAL MATCH (employee)-[:BELONGS_TO]->(department:Department)
    OPTIONAL MATCH (employee)-[:BELONGS_TO]->(section:Section)
    OPTIONAL MATCH (employee)-[:BELONGS_TO]->(group:JtektGroup)
    RETURN employee, workplace, division, department, section, group
    `, {
      employee_number: res.locals.user.properties.employee_number,
    })
  .then(result => { res.send(result.records); })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
});



app.post('/employee_info_from_employee_number', check_authentication, (req, res) => {

  // TODO: combine with personal information

  // Route to retrive the information of an employee by employee_number
  const session = driver.session();
  session
  .run(`
    MATCH (employee:Employee {employee_number:{employee_number}})
    WITH employee
    OPTIONAL MATCH (employee)-[:WORKS_IN]->(workplace:Workplace)
    OPTIONAL MATCH (employee)-[:BELONGS_TO]->(division:Division)
    OPTIONAL MATCH (employee)-[:BELONGS_TO]->(department:Department)
    OPTIONAL MATCH (employee)-[:BELONGS_TO]->(section:Section)
    OPTIONAL MATCH (employee)-[:BELONGS_TO]->(group:JtektGroup)
    RETURN employee, workplace, division, department, section, group
    `, {
      employee_number: req.body.employee_number,
    })
  .then(result => { res.send(result.records); })
  .catch(error => res.status(400).send(`Error accessing DB: ${error}`))
  .finally(() => session.close())
});


app.post('/get_all_workplaces', function (req, res) {
  const session = driver.session();
  session
  .run(`
    MATCH (workplace:Workplace)
    RETURN workplace
    `,{})
  .then(result => {
    session.close();
    res.send(result.records);
  })
  .catch(error => res.status(400).send(`Error accessing DB: ${error}`))

});

app.get('/all_workplaces', (req, res) => {
  const session = driver.session();
  session
  .run(`
    MATCH (workplace:Workplace)
    RETURN workplace
    `,{})
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })

});


app.post('/get_all_divisions', function (req, res) {
  // LEGACY
  // Should be delete sometime soon
  const session = driver.session();
  session
  .run(`
    MATCH (division:Division)
    RETURN division
    `,{})
  .then(result => {
    session.close();
    res.send(result.records);
  })
  .catch(error => res.status(400).send(`Error accessing DB: ${error}`))
});

app.post('/get_units_directly_belonging_to_node', function (req, res) {
  // THIS IS THE OLD ONE
  // Should be deleted soon
  const session = driver.session();
  session
  .run(`
    // Build a map to get the target node label
    WITH {Division: "Department", Department: "Section", Section: "JtektGroup"} AS hierarchy_map

    // Match the node itself and the parent it belongs to
    MATCH (n)<-[:BELONGS_TO]-(a)

    // Using index is not good practice!
    WHERE ID(n)={node_id} AND hierarchy_map[LABELS(n)[0]] IN LABELS(a)

    RETURN a
    `, {
      node_id: req.body.node_id,
    })
  .then(result => {
    session.close();
    res.send(result.records)
  })
  .catch(error => res.status(400).send(`Error accessing DB: ${error}`))
});

app.post('/get_employees_belonging_to_node', function (req, res) {
  const session = driver.session();
  session
  .run(`
    MATCH (n)<-[:BELONGS_TO]-(employee:Employee)
    WHERE id(n) = {node_id}
    RETURN employee
    `, {
      node_id: req.body.node_id,
    })
  .then(result => {
    session.close();
    res.send(result.records);
  })
  .catch(error => res.status(400).send(`Error accessing DB: ${error}`))
});

app.post('/get_users_of_group', function (req, res) {
  const session = driver.session();
  session
  .run(`
    MATCH (n)<-[:BELONGS_TO]-(employee:Employee)
    WHERE id(n) = {node_id}
    RETURN employee
    `, {
      node_id: req.body.group_id,
    })
  .then(result => {
    session.close();
    res.send(result.records);
  })
  .catch(error => res.status(400).send(`Error accessing DB: ${error}`))
});





app.listen(app_port, () => console.log(`Employee manager listening on port ${app_port}`))
