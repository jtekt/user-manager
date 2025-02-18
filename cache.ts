import { createClient } from "redis"
import { identifierFields } from "./config"

export const { REDIS_URL } = process.env

let client: any

export const init = async () => {
  if (!REDIS_URL) {
    console.log(`[Cache] REDIS_URL not set, skipping`)
    return
  }

  console.log(`[Cache] Using redis at ${REDIS_URL}`)

  client = createClient({ url: REDIS_URL })

  client.on("error", (err: any) => console.log("Redis Client Error", err))

  await client.connect()
}

export const getUserFromCache = async (user_id: string) => {
  if (!client) return
  const userFromCache = await client.get(`user:${user_id}`)
  if (!userFromCache) return
  return { ...JSON.parse(userFromCache), cached: true }
}

export const setUserInCache = async (user: any, field: string = "_id") => {
  if (!client) return
  const identifier = user[field]
  if (field) {
    console.log(`[Cache] Setting user using ${field}: ${identifier} in cache`)
    await client.set(`user:${identifier}`, JSON.stringify(user), {
      EX: 60 * 60 * 12,
    })
  }
}

// Loops all the cacheIdentifierFields and removes the user from cache
export const removeUserFromCache = (user: any) => {
  if (!client) return
  identifierFields.forEach(async field => {
    const identifier = user[field]
    if (identifier) {
      console.log(`[Cache] Removing user ${user[field]} from cache`)
      await client.del(`user:${user[field]}`)
    }
  });
}
