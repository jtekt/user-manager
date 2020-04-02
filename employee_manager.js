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


app.post('/get_own_node', check_authentication, function (req, res) {
  // Route to retrieve one's information
  res.send(res.locals.user)
});

app.post('/get_nodes_related_to_own', check_authentication, function (req, res) {
  // Route to retrieve one's information
  const session = driver.session();
  session
  .run(`
    MATCH (employee:Employee {employee_number:{employee_number}})
    WITH employee
    MATCH (related_node)--(employee)
    RETURN related_node
    `,
    {
      employee_number: res.locals.user.properties.employee_number,
    })
  .then(result => { res.send(result.records); })
  .catch(error => res.status(400).send(`Error accessing DB: ${error}`))
  .finally(() => session.close())
});


app.post('/personal_information_v2', check_authentication, function (req, res) {
  // Route to retrive the information of the user currently logged in
  // STILL NOT IDEAL AS SOME NODES MIGHT BECOME USEFUL IN THE FUTURE

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
  .catch(error => res.status(400).send(`Error accessing DB: ${error}`))
  .finally(() => session.close())
});



app.post('/employee_info_from_employee_number', check_authentication, function (req, res) {

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


app.post('/get_all_divisions', function (req, res) {
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

app.post('/update_workplace', check_authentication, function (req, res) {
  // Route to retrive user workplaces

  // Getting user info from Neo4J
  const session = driver.session();
  session
  .run(`
    // Find employee
    MATCH (e:Employee {employee_number: {employee_number} })
    WITH e

    // Remove current workplace if exists
    OPTIONAL MATCH (e)-[r_old:WORKS_IN]->(workplace_old:Workplace)
    DELETE r_old

    // Make new workplace relationship
    WITH e
    MATCH (workplace_new:Workplace)
    WHERE id(workplace_new) = {new_workplace_id}
    MERGE (e)-[:WORKS_IN]->(workplace_new)

    // Finally
    RETURN e, workplace_new
    `,{
      employee_number: res.locals.user.properties.employee_number,
      new_workplace_id: neo4j.int(req.body.new_workplace_id),
    })
  .then(result => {
    session.close();
    res.send(result.records);
  })
  .catch(error => res.status(400).send(`Error accessing DB: ${error}`))

});



app.listen(app_port, () => console.log(`Employee manager listening on port ${app_port}`))
