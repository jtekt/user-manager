import createHttpError from "http-errors";
import { drivers } from "../../db";
import { get_current_user_id, user_query } from "../../utils/users";
import { Request, Response, NextFunction } from "express";

const driver = drivers.v1;

// TODO: deprecate this endpoint
export const getUser = (req: Request, res: Response, next: NextFunction) => {
  let { user_id } = req.params;
  if (user_id === "self") user_id = get_current_user_id(res);
  if (!user_id) throw createHttpError(400, `user_id not defined`);

  const session = driver.session();

  const query = `${user_query} RETURN user`;

  session
    .run(query, { identifier: user_id })
    .then(({ records }: any) => {
      if (!records.length)
        throw createHttpError(404, `User ${user_id} not found`);
      res.send(records);
    })
    .catch(next)
    .finally(() => {
      session.close();
    });
};

export const getUsers = (req: Request, res: Response, next: NextFunction) => {
  let search_query = "";
  if (req.query.search) {
    search_query = `
    // Make a list of the keys of each node
    // Additionally, filter out fields that should not be searched
    WITH [key IN KEYS(user) WHERE NOT key IN $exceptions] AS keys, user

    // Unwinding
    UNWIND keys as key

    // Filter nodes by looking for properties
    WITH key, user
    WHERE toLower(toString(user[key])) CONTAINS toLower($search)
    `;
  }

  let ids_query = "";
  if (req.query.ids) {
    search_query = `
    WITH user
    UNWIND $ids as id
    WITH id, user
    WHERE user._id = id
    `;
  }

  const session = driver.session();

  const query = `
  MATCH (user:User)

  ${search_query}
  ${ids_query}

  RETURN DISTINCT user

  LIMIT 100
  `;

  const params = {
    search: req.query.search,
    exceptions: ["password_hashed"],
    ids: req.query.ids,
  };

  session
    .run(query, params)
    .then(({ records }: any) => {
      const users = records.map((record: any) => record.get("user"));
      res.send(users);
    })
    .catch(next)
    .finally(() => {
      session.close();
    });
};
