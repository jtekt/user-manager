const request = require("supertest")
const {expect} = require("chai")
const {app} = require("../index.js")
const dotenv = require('dotenv')
dotenv.config()



const {
  TEST_USERNAME = 'administrator',
  TEST_PASSWORD = 'administrator',
} = process.env

// We will test for api users
describe("/v1/users", () => {

  let admin_jwt
  let admin_id
  let user_id
  let new_user_id
  const new_user = {
    email_address: 'test_user@jtekt.co.jp',
    password: 'banana',
    password_confirm: 'banana'
  }

  before( async () => {
    //console.log = function () {}
    const {body} = await request(app)
      .post("/v2/auth/login")
      .send({username: TEST_USERNAME, password: TEST_PASSWORD})

    admin_jwt = body.jwt
    admin_id = body.user.properties._id
  })

  describe("GET /v1/users/", () => {

    it("Should not allow unauthenticated access to users", async () => {

      const {status} = await request(app)
        .get("/v1/users/")

      expect(status).to.equal(403)
    })

    it("Should allow authenticated users to query users", async () => {

      const {status, body} = await request(app)
        .get("/v1/users/")
        .set('Authorization', `Bearer ${admin_jwt}`)



      console.log(body)

      expect(status).to.equal(200)
      expect(body.length).to.be.above(0)
    })
  })

  describe("GET /v1/users/:user_id", () => {

    it("Should allow user to query a user", async () => {

      const {status} = await request(app)
        .get(`/v1/users/${admin_id}`)
        .set('Authorization', `Bearer ${admin_jwt}`)

      expect(status).to.equal(200)
    })

    it("Should allow user to query self", async () => {

      const {status} = await request(app)
        .get(`/v1/users/self`)
        .set('Authorization', `Bearer ${admin_jwt}`)

      expect(status).to.equal(200)
    })

    it("Should not allow unauthenticated user to query user", async () => {

      const {status} = await request(app)
        .get(`/v1/users/${admin_id}`)

      expect(status).to.equal(403)
    })


  })


})
