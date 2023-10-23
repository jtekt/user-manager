const { createClient } = require("redis")

const { REDIS_URL } = process.env

let client

exports.init = async () => {
  if (!REDIS_URL) {
    console.log(`[Cache] REDIS_URL not set, skipping`)
    return
  }

  console.log(`[Cache] Using redis at ${REDIS_URL}`)

  client = createClient({ url: REDIS_URL })

  client.on("error", (err) => console.log("Redis Client Error", err))

  await client.connect()
}

exports.getCache = () => client

exports.getUserFromCache = async (user_id) => {
  if (!client) return
  const userFromCache = await client.get(`user:${user_id}`)
  if (!userFromCache) return
  console.log(`[Cache] fetched user ${user_id} from cache`)
  return { ...JSON.parse(userFromCache), cached: true }
}

exports.setUserInCache = async (user) => {
  if (!client) return
  await client.set(`user:${user._id}`, JSON.stringify(user), {
    EX: 60 * 60 * 12,
  })
}
