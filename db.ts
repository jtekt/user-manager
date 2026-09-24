import neo4j from "neo4j-driver";
import { hash_password } from "./utils/passwords";
import { userQueryIdentifierFields } from "./config";

export const {
  NEO4J_URL = "bolt://localhost",
  NEO4J_USERNAME = "neo4j",
  NEO4J_PASSWORD = "neo4j",
  DEFAULT_ADMIN_USERNAME: admin_username = "administrator",
  DEFAULT_ADMIN_PASSWORD: admin_password = "administrator",
} = process.env;

const auth = neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD);

export const drivers = {
  v1: neo4j.driver(NEO4J_URL, auth, {}),
  v2: neo4j.driver(NEO4J_URL, auth, { disableLosslessIntegers: true }),
};

export const driver = drivers.v2; // alias

// Set once the DB setup (admin account, IDs, constraints) has completed
let initialized = false;

// Live check: whether Neo4J can be reached right now
export const get_connection_status = async () => {
  try {
    await driver.verifyConnectivity();
    return true;
  } catch {
    return false;
  }
};

const set_ids_to_nodes_without_ids = async () => {
  const id_setting_query = `
  MATCH (u:User)
  WHERE u._id IS NULL
  SET u._id = toString(id(u))
  RETURN COUNT(u) as count
  `;

  const session = driver.session();

  try {
    const { records } = await session.run(id_setting_query);
    const count = records[0].get("count");
    console.log(`[Neo4J] ID of ${count} nodes have been set`);
  } catch (error) {
    console.error(`Setting IDs failed`);
    throw error;
  } finally {
    session.close();
  }
};

const create_admin_if_not_exists = async () => {
  console.log(`[Neo4J] Creating admin account`);

  const session = driver.session();

  try {
    const password_hashed = await hash_password(admin_password);

    const query = `
      // Find the administrator account or create it if it does not exist
      MERGE (administrator:User {username:$admin_username})

      // Check if the administrator account is missing its password
      // If the administrator account does not have a password (newly created), set it
      // TODO: consider using ON CREATE
      WITH administrator
      WHERE administrator.password_hashed IS NULL
      SET administrator.password_hashed = $password_hashed
      SET administrator._id = randomUUID() // THIS IS IMPORTANT
      SET administrator.isAdmin = true

      // Set some additional properties
      SET administrator.display_name = 'Administrator'

      // Return the account
      RETURN administrator
      `;

    const { records } = await session.run(query, {
      admin_username,
      password_hashed,
    });

    if (records.length)
      console.log(`[Neo4J] Admin creation: admin account created`);
    else console.log(`[Neo4J] Admin creation: admin already existed`);
  } catch (error) {
    console.error(`Admin creation failed`);
    throw error;
  } finally {
    session.close();
  }
};

const create_constraints = async () => {
  // const fields = ["_id", "username"];
  const fields = userQueryIdentifierFields; // Is this really OK?
  const session = driver.session();

  try {
    for (const field of fields) {
      console.log(`[Neo4J] Creating ${field} constraint`);
      await session.run(
        `CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.${field} IS UNIQUE`
      );
    }
  } finally {
    session.close();
  }
};

// Retries until the setup succeeds, so a DB that is not up yet never crashes the app
export const init = async () => {
  try {
    console.log("[Neo4J] Initializing DB");
    await create_admin_if_not_exists();
    await set_ids_to_nodes_without_ids();
    await create_constraints();
    initialized = true;
    console.log(`[Neo4J] DB initialized`);
  } catch (error) {
    console.error("[Neo4J] DB initialization failed, retrying in 10s", error);
    setTimeout(init, 10000);
  }
};

export const url = NEO4J_URL;
export const get_initialized = () => initialized;
