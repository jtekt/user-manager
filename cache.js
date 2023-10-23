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
