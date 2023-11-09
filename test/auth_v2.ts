import request from "supertest"
import { expect } from "chai"
import { app } from "../index"
import dotenv from "dotenv"
dotenv.config()

const sleep = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay))

const { TEST_USERNAME = "administrator", TEST_PASSWORD = "administrator" } =
  process.env

// We will test for api users
describe("/v2/auth", () => {
  before(async () => {
    //console.log = function () {}
    await sleep(10000) // wait for admin account to create (DIRTY)
  })

  // We will test root GET related logics
  describe("POST /v2/auth/login", () => {
    // What should it do
    it("Should allow login with correct credentials", async () => {
      const { status } = await request(app)
        .post("/v2/auth/login")
        .send({ username: TEST_USERNAME, password: TEST_PASSWORD })

      expect(status).to.equal(200)
    })

    it("Should not allow random user login", async () => {
      const { status } = await request(app)
        .post("/v2/auth/login")
        .send({ username: "roger", password: "banana" })

      expect(status).to.equal(403)
    })
  })
})
