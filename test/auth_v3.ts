import request from "supertest"
import { expect } from "chai"
import { app } from "../index"

const sleep = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay))

const { TEST_USERNAME = "administrator", TEST_PASSWORD = "administrator" } =
  process.env

describe("/v3/auth", () => {
  before(async () => {
    //console.log = function () {}
    await sleep(7000) // wait for admin account to create (DIRTY)
  })

  describe("POST /v3/auth/login", () => {
    it("Should allow login with correct credentials", async () => {
      const { status } = await request(app)
        .post("/v3/auth/login")
        .send({ username: TEST_USERNAME, password: TEST_PASSWORD })

      expect(status).to.equal(200)
    })

    it("Should not allow random user login", async () => {
      const { status } = await request(app)
        .post("/v3/auth/login")
        .send({ username: "roger", password: "banana" })

      expect(status).to.equal(403)
    })

    it("Should reject login without an identifier", async () => {
      const { status } = await request(app)
        .post("/v3/auth/login")
        .send({ password: TEST_PASSWORD })

      expect(status).to.equal(400)
    })

    it("Should reject login without a password", async () => {
      const { status } = await request(app)
        .post("/v3/auth/login")
        .send({ username: TEST_USERNAME })

      expect(status).to.equal(400)
    })
  })
})
