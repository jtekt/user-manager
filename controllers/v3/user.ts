import createHttpError from "http-errors";
import { hash_password } from "../../utils/passwords";
import { driver } from "../../db";
import { Request, Response, NextFunction } from "express";

import {
  newUserSchema,
  userUpdateSchema,
  userAdminUpdateSchema,
} from "../../schemas/users";
import { get_current_user_id, user_query } from "../../utils/users";
import {
  getUserFromCache,
  setUserInCache,
  removeUserFromCache,
} from "../../cache";
import { searchableFields, userQueryIdentifierFields } from "../../config";

export const create_user = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = driver.session();

  try {
    if (!res.locals.user.isAdmin)
      throw createHttpError(403, `Only administrators can create users`);

    const properties = req.body;
    // TODO: only email
    try {
      await newUserSchema.validateAsync(properties);
    } catch (error: any) {
      throw createHttpError(400, error);
    }

    const { password, email_address, username, display_name } = properties;

    const password_hashed = await hash_password(password);

    // MERGE on email_address if provided, otherwise on username
    const mergeKey = email_address ? "email_address" : "username";
    const mergeValue = email_address || username;

    // TODO: allow additional labels via env var
    const query = `
      MERGE (user:User:Employee {${mergeKey}: $merge_value})

      ON CREATE SET user += $user_properties
      ON CREATE SET user._id = randomUUID()
      ON CREATE SET user.creation_date = date()

      RETURN properties(user) as user
      `;

    const user_properties: Record<string, any> = {
      password_hashed,
      display_name: display_name || email_address || username,
    };
    if (email_address) user_properties.email_address = email_address;
    if (username) user_properties.username = username;

    const { records } = await session.run(query, { user_properties, merge_value: mergeValue });

    const user = records[0].get("user");
    delete user.password_hashed;

    console.log(`[Neo4J] User ${user._id} created`);

    res.send(user);
  } catch (error) {
    next(error);
  } finally {
    session.close();
  }
};

export const get_users = (req: Request, res: Response, next: NextFunction) => {
  const {
    search = "",
    batch_size = "100",
    start_index = "0",
    sort = "display_name",
    order = "ASC",
    employee_numbers = [], // TODO: deprecate
    ...rest
  } = req.query;

  if (order !== "ASC" && order !== "DESC")
    throw createHttpError(400, `order can only be ASC or DESC`);

  // This uses the $search param, i.e. the ?search= query param
  const searchArgs = searchableFields
    .map((f) => `toLower(user.${f}) CONTAINS toLower($search)`)
    .join(" OR ");

  const { filters, identifiers } = Object.keys(rest).reduce(
    (acc: any, queryParamKey) => {
      const queryParamValue = rest[queryParamKey];

      // TODO: get list that from config?
      // TODO: username should be matched against username, etc.
      const queryParamsIdentifierKeys = [
        "id",
        "_id",
        "identifier",
        "username",
        "ids",
        "_ids",
        "identifiers",
        "usernames",
      ];

      if (queryParamsIdentifierKeys.includes(queryParamKey)) {
        // It's an identifiers
        if (Array.isArray(queryParamValue))
          acc.identifiers.push(...(queryParamValue as string[]));
        else if (typeof queryParamValue === "string")
          acc.identifiers.push(queryParamValue);
      } else {
        acc.filters[queryParamKey] = queryParamValue;
      }

      return acc;
    },
    { filters: {}, identifiers: [] }
  );

  // filters as array not supported for now
  if (Object.keys(filters).some((k) => Array.isArray(filters[k])))
    throw createHttpError(400, `Filters cannot be arrays`);

  const identifiersQueryArgs = userQueryIdentifierFields
    .map((f) => `user.${f} IN $identifiers`)
    .join(" OR ");

  const identifiersQuery = `AND (${identifiersQueryArgs})`;

  // TODO: Deprecate as specific to this app
  if (!Array.isArray(employee_numbers))
    throw createHttpError(400, `employee_numbers must be an array`);
  const employeeNumbersQuery = `AND user.employee_number IN $employee_numbers`;

  const filteringQuery = `
    WITH user
    UNWIND KEYS($filters) as filterKey
    WITH filterKey, user
    WHERE user[filterKey] = $filters[filterKey]
    `;

  // IDEA: could use a dummy query to start off WHERE clause
  const query = `
    OPTIONAL MATCH (user:User)
    WHERE (${searchArgs})
    ${identifiers.length ? identifiersQuery : ""}
    ${employee_numbers.length ? employeeNumbersQuery : ""}
    ${Object.keys(filters).length ? filteringQuery : ""}
    

    WITH user ORDER BY user[$sort] ${order}

    // Aggregation, pagination
    WITH
      COLLECT(DISTINCT properties(user)) as users,
      COUNT(DISTINCT user) as count,
      toInteger($start_index) as start_index,
      toInteger($batch_size) as batch_size,
      (toInteger($start_index)+toInteger($batch_size)) as end_index

    // Batching
    RETURN
      count,
      users[start_index..end_index] AS users,
      start_index,
      batch_size
    `;

  const parameters = {
    search,
    start_index,
    batch_size,
    sort,
    order,
    identifiers,
    filters,
    employee_numbers, // TODO: deprecate
  };

  const session = driver.session();
  session
    .run(query, parameters)
    .then(({ records }: any) => {
      const record = records[0];
      if (!record) throw createHttpError(404, `No record found`);

      const users = record.get("users");
      users.forEach((user: any) => {
        delete user.password_hashed;
      });

      const response = {
        batch_size: record.get("batch_size"),
        start_index: record.get("start_index"),
        count: record.get("count"),
        users,
      };

      res.send(response);
    })
    .catch(next)
    .finally(() => {
      session.close();
    });
};

export const get_user = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Route to retrieve a user's data
  let { user_id } = req.params;
  if (user_id === "self") return res.send(res.locals.user);
  if (!user_id) throw createHttpError(400, `user_id not defined`);

  // Forcing as string, hopefully just temporary
  // was needed for whereabouts
  user_id = user_id.toString();

  let user = await getUserFromCache(user_id);
  if (user) {
    delete user.password_hashed;
    return res.send(user);
  }

  const session = driver.session();

  const query = `${user_query} RETURN properties(user) as user`;

  try {
    const { records } = await session.run(query, { identifier: user_id });

    if (!records.length)
      throw createHttpError(400, `User ${user_id} not found`);

    user = records[0].get("user");
    setUserInCache(user);
    user.cached = false;
    delete user.password_hashed;

    res.send(user);
  } catch (error) {
    next(error);
  } finally {
    session.close();
  }
};

export const patch_user = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = driver.session();

  try {
    const current_user_id = get_current_user_id(res);
    const current_user_is_admin = res.locals.user.isAdmin;

    let { user_id } = req.params;
    if (user_id === "self") user_id = current_user_id;
    if (!user_id) throw createHttpError(400, `Missing user_id`);

    // Prevent normal users to modify another user
    if (!current_user_is_admin && user_id != current_user_id) {
      throw createHttpError(403, `Unauthorized to modify another user's data`);
    }

    const properties = req.body;

    try {
      if (current_user_is_admin)
        await userAdminUpdateSchema.validateAsync(properties);
      else await userUpdateSchema.validateAsync(properties);
    } catch (error: any) {
      throw createHttpError(403, error);
    }

    const query = `
      ${user_query}
      SET user += $properties
      RETURN user`;

    const params = { identifier: user_id, properties };

    const { records } = await session.run(query, params);

    if (!records.length)
      throw createHttpError(404, `User ${user_id} not found`);

    const user = records[0].get("user");

    removeUserFromCache(user);

    res.send(user);
    console.log(`User ${user_id} patched`);
  } catch (error) {
    next(error);
  } finally {
    session.close();
  }
};

export const delete_user = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Prevent normal users to delete a user
  if (!res.locals.user.isAdmin)
    throw createHttpError(403, `Unauthorized to delete users`);

  const { user_id } = req.params;

  if (!user_id) throw createHttpError(404, `User ID not defined`);

  const session = driver.session();

  const query = `
    ${user_query}
    WITH user, properties(user) AS userData
    DETACH DELETE (user)
    RETURN userData AS user`;

  session
    .run(query, { identifier: user_id })
    .then(({ records }: any) => {
      if (!records.length)
        throw createHttpError(404, `User ${user_id} not found`);
      console.log(`User ${user_id} deleted`);
      const user = records[0].get("user");
      removeUserFromCache(user);
      res.send({ user_id });
    })
    .catch(next)
    .finally(() => session.close());
};
