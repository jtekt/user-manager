import request from "supertest"
import { expect } from "chai"
import { app } from "../index"

const sleep = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay))

const { TEST_USERNAME = "administrator", TEST_PASSWORD = "administrator" } =
  process.env

describe("/v2/auth", () => {
  before(async () => {
    await sleep(10000) // wait for admin account to create
  })

  describe("POST /v2/auth/login", () => {
    it("Should allow login with correct credentials", async () => {
      const { status } = await request(app)
        .post("/v2/auth/login")
        .send({ username: TEST_USERNAME, password: TEST_PASSWORD })

      expect(status).to.equal(200)
    })

    it("Should return a JWT on successful login", async () => {
      const { body } = await request(app)
        .post("/v2/auth/login")
        .send({ username: TEST_USERNAME, password: TEST_PASSWORD })

      expect(body).to.have.property("jwt").that.is.a("string")
    })

    it("Should not include password_hashed in login response", async () => {
      const { body } = await request(app)
        .post("/v2/auth/login")
        .send({ username: TEST_USERNAME, password: TEST_PASSWORD })

      expect(body.user?.properties).to.not.have.property("password_hashed")
    })

    it("Should not allow login with wrong password", async () => {
      const { status } = await request(app)
        .post("/v2/auth/login")
        .send({ username: TEST_USERNAME, password: "wrongpassword" })

      expect(status).to.equal(403)
    })

    it("Should not allow login for unknown user", async () => {
      const { status } = await request(app)
        .post("/v2/auth/login")
        .send({ username: "nobody", password: "banana" })

      expect(status).to.equal(403)
    })

    it("Should reject login without an identifier", async () => {
      const { status } = await request(app)
        .post("/v2/auth/login")
        .send({ password: TEST_PASSWORD })

      expect(status).to.equal(400)
    })

    it("Should reject login without a password", async () => {
      const { status } = await request(app)
        .post("/v2/auth/login")
        .send({ username: TEST_USERNAME })

      expect(status).to.equal(400)
    })
  })

  describe("Authenticated routes", () => {
    let jwt: string

    before(async () => {
      const { body } = await request(app)
        .post("/v2/auth/login")
        .send({ username: TEST_USERNAME, password: TEST_PASSWORD })

      jwt = body.jwt
    })

    it("Should reject requests without a token", async () => {
      const { status } = await request(app).get("/v2/users/self")
      expect(status).to.be.oneOf([401, 403])
    })

    it("Should accept requests with a valid token", async () => {
      const { status } = await request(app)
        .get("/v2/users/self")
        .set("Authorization", `Bearer ${jwt}`)

      expect(status).to.equal(200)
    })

    it("Should reject requests with an invalid token", async () => {
      const { status } = await request(app)
        .get("/v2/users/self")
        .set("Authorization", `Bearer invalid.jwt.token`)

      expect(status).to.be.oneOf([401, 403])
    })
  })
})
