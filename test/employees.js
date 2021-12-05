const request = require("supertest")
const {expect} = require("chai")
const {app} = require("../index.js")
const dotenv = require('dotenv')
dotenv.config()

let jwt

const {
  TEST_USERNAME = 'admin',
  TEST_PASSWORD = 'admin',
} = process.env

// We will test for api users
describe("/users", () => {

  beforeEach( async () => {
    console.log = function () {}
    const {body} = await request(app)
      .post("/v2/auth/login")
      .send({username: TEST_USERNAME, password: TEST_PASSWORD})

    jwt = body.jwt
  })

  describe("GET /v2/users/", () => {

    it("Should not allow anonymous access to users", async () => {

      const res = await request(app)
        .get("/v2/users/")

      expect(res.status).to.equal(403)
    })

    it("Should allow authenticated users to query users", async () => {

      const res = await request(app)
        .get("/v2/users/")
        .set('Authorization', `Bearer ${jwt}`)

      expect(res.status).to.equal(200)
    })
  })



})
