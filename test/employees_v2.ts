import request from "supertest"
import { expect } from "chai"
import { app } from "../index.js"
import dotenv from "dotenv"
dotenv.config()

const { TEST_USERNAME = "administrator", TEST_PASSWORD = "administrator" } =
  process.env

// We will test for api users
describe("/v2/users", () => {
  let admin_jwt: string

  before(async () => {
    //console.log = function () {}
    const { body } = await request(app)
      .post("/v2/auth/login")
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD })

    admin_jwt = body.jwt
  })

  describe("GET /v2/users/", () => {
    it("Should not allow unauthenticated access to users", async () => {
      const { status } = await request(app).get("/v2/users/")

      expect(status).to.equal(403)
    })

    it("Should allow authenticated users to query users", async () => {
      const { status } = await request(app)
        .get("/v2/users/")
        .set("Authorization", `Bearer ${admin_jwt}`)

      expect(status).to.equal(200)
    })
  })

  describe("GET /v2/users/self", () => {
    it("Should allow authenticated users to query himself", async () => {
      const { status, body } = await request(app)
        .get("/v2/users/self")
        .set("Authorization", `Bearer ${admin_jwt}`)

      if (body.properties) admin_id = body.properties._id

      expect(status).to.equal(200)
    })
  })

  // describe("POST /v2/users/", () => {
  //
  //
  //   it("Should allow user creation", async () => {
  //
  //     const {status, body} = await request(app)
  //       .post("/v2/users/")
  //       .send(new_user)
  //       .set('Authorization', `Bearer ${admin_jwt}`)
  //
  //     if(body.properties) new_user_id = body.properties._id
  //     expect(status).to.equal(200)
  //   })
  //
  //   it("Should not allow unauthenticated user creation", async () => {
  //     const {status} = await request(app)
  //       .post("/v2/users/")
  //       .send(new_user)
  //     expect(status).to.equal(403)
  //   })
  // })

  // describe("POST /v2/auth/login", () => {
  //
  //
  //   it("Should allow login as the new user", async () => {
  //
  //     const {status, body} = await request(app)
  //       .post("/v2/auth/login")
  //       .send(new_user)
  //
  //     new_user_jwt =body.jwt
  //
  //     expect(status).to.equal(200)
  //   })
  //
  //   it("Should not allow unauthenticated user creation", async () => {
  //     const {status} = await request(app)
  //       .post("/v2/users/")
  //       .send(new_user)
  //     expect(status).to.equal(403)
  //   })
  //
  // })
  //
  // describe("GET /v2/users/:user_id", () => {
  //
  //   it("Should not allow unauthenticated access to user", async () => {
  //     const {status} = await request(app).get(`/v2/users/${user_id}`)
  //     expect(status).to.equal(403)
  //   })
  //
  //   it("Should allow authenticated users to query the created user", async () => {
  //
  //     const {status} = await request(app)
  //       .get(`/v2/users/${new_user_id}`)
  //       .set('Authorization', `Bearer ${admin_jwt}`)
  //
  //     expect(status).to.equal(200)
  //   })
  // })
  //
  // describe("PATCH /v2/users/:user_id/", () => {
  //
  //   it("Should prevent update of _id", async () => {
  //     const {status} = await request(app)
  //     .patch(`/v2/users/${new_user_id}/`)
  //     .send({_id: 'banana'})
  //     .set('Authorization', `Bearer ${admin_jwt}`)
  //
  //     expect(status).to.equal(403)
  //   })
  //
  //   it("Should allow update own display name", async () => {
  //     const {status} = await request(app)
  //     .patch(`/v2/users/${new_user_id}/`)
  //     .send({display_name: 'banana'})
  //     .set('Authorization', `Bearer ${new_user_jwt}`)
  //
  //     expect(status).to.equal(200)
  //   })
  //
  //   it("Should prevent update display name of others", async () => {
  //     const {status} = await request(app)
  //     .patch(`/v2/users/${admin_id}/`)
  //     .send({display_name: 'banana'})
  //     .set('Authorization', `Bearer ${new_user_jwt}`)
  //
  //     expect(status).to.equal(403)
  //   })
  //
  //
  // })
  //
  // describe("PUT /v2/users/:user_id/password", () => {
  //
  //   it("Should allow own password update", async () => {
  //     const {status} = await request(app)
  //     .put(`/v2/users/${new_user_id}/password`)
  //     .send({new_password: 'newPassword', new_password_confirm: 'newPassword'})
  //     .set('Authorization', `Bearer ${new_user_jwt}`)
  //
  //     expect(status).to.equal(200)
  //   })
  //
  //   it("Should prevent password update of others", async () => {
  //     const {status} = await request(app)
  //     .put(`/v2/users/${admin_id}/password`)
  //     .send({new_password: 'newPassword', new_password_confirm: 'newPassword'})
  //     .set('Authorization', `Bearer ${new_user_jwt}`)
  //
  //     expect(status).to.equal(403)
  //   })
  //
  //
  // })
  //
  // describe("DELETE /v2/users/:user_id", () => {
  //
  //   it("Should not allow unauthenticated user deletion", async () => {
  //     const {status} = await request(app).delete(`/v2/users/${user_id}`)
  //     expect(status).to.equal(403)
  //   })
  //
  //   it("Should allow user deletion", async () => {
  //     const {status} = await request(app)
  //       .delete(`/v2/users/${new_user_id}`)
  //       .set('Authorization', `Bearer ${admin_jwt}`)
  //     expect(status).to.equal(200)
  //   })
  //
  // })
})
