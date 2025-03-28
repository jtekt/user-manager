import request from "supertest";
import { expect } from "chai";
import { app } from "../index";

const { TEST_USERNAME = "administrator", TEST_PASSWORD = "administrator" } =
  process.env;

// We will test for api users
describe("/v3/users", () => {
  let admin_jwt: string;
  let admin_id: string;
  let user_id: string;
  let new_user_id: string;
  let new_user_jwt: string;
  const new_user = {
    email_address: "test_user@jtekt.co.jp",
    password: "banana",
    password_confirm: "banana",
  };

  before(async () => {
    // console.log = function () {}
    const { body } = await request(app)
      .post("/v3/auth/login")
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD });

    admin_jwt = body.jwt;
  });

  describe("GET /v3/users/", () => {
    it("Should not allow unauthenticated access to users", async () => {
      const { status } = await request(app).get("/v3/users/");

      expect(status).to.equal(401);
    });

    it("Should allow authenticated users to query users", async () => {
      const { status } = await request(app)
        .get("/v3/users/")
        .set("Authorization", `Bearer ${admin_jwt}`);

      expect(status).to.equal(200);
    });
  });

  describe("GET /v3/users/self", () => {
    it("Should allow authenticated users to query himself", async () => {
      const { status, body } = await request(app)
        .get("/v3/users/self")
        .set("Authorization", `Bearer ${admin_jwt}`);

      admin_id = body._id;

      expect(status).to.equal(200);
    });
  });

  describe("POST /v3/users/", () => {
    it("Should allow user creation", async () => {
      const { status, body } = await request(app)
        .post("/v3/users/")
        .send(new_user)
        .set("Authorization", `Bearer ${admin_jwt}`);

      new_user_id = body._id;
      expect(status).to.equal(200);
    });

    it("Should not allow unauthenticated user creation", async () => {
      const { status } = await request(app).post("/v3/users/").send(new_user);
      expect(status).to.equal(401);
    });
  });

  describe("POST /v3/auth/login", () => {
    it("Should allow login as the new user", async () => {
      const { status, body } = await request(app)
        .post("/v3/auth/login")
        .send(new_user);

      new_user_jwt = body.jwt;

      expect(status).to.equal(200);
    });

    it("Should not allow unauthenticated user creation", async () => {
      const { status } = await request(app).post("/v3/users/").send(new_user);
      expect(status).to.equal(401);
    });
  });

  describe("GET /v3/users/:user_id", () => {
    it("Should not allow unauthenticated access to user", async () => {
      const { status } = await request(app).get(`/v3/users/${new_user_id}`);
      expect(status).to.equal(401);
    });

    it("Should allow authenticated users to query the created user", async () => {
      const { status } = await request(app)
        .get(`/v3/users/${new_user_id}`)
        .set("Authorization", `Bearer ${admin_jwt}`);

      expect(status).to.equal(200);
    });
  });

  describe("PATCH /v3/users/:user_id/", () => {
    it("Should prevent update of _id", async () => {
      const { status } = await request(app)
        .patch(`/v3/users/${new_user_id}/`)
        .send({ _id: "banana" })
        .set("Authorization", `Bearer ${admin_jwt}`);

      expect(status).to.equal(403);
    });

    it("Should allow update own display name", async () => {
      const { status } = await request(app)
        .patch(`/v3/users/${new_user_id}/`)
        .send({ display_name: "banana" })
        .set("Authorization", `Bearer ${new_user_jwt}`);

      expect(status).to.equal(200);
    });

    it("Should prevent the update of display_name of another user", async () => {
      const { status } = await request(app)
        .patch(`/v3/users/${admin_id}/`)
        .send({ display_name: "banana" })
        .set("Authorization", `Bearer ${new_user_jwt}`);

      expect(status).to.equal(403);
    });
  });

  describe("PUT /v3/users/:user_id/password", () => {
    it("Should allow own password update", async () => {
      const { status } = await request(app)
        .put(`/v3/users/${new_user_id}/password`)
        .send({
          new_password: "newPassword",
          new_password_confirm: "newPassword",
        })
        .set("Authorization", `Bearer ${new_user_jwt}`);

      expect(status).to.equal(200);
    });

    it("Should prevent password update of others", async () => {
      const { status } = await request(app)
        .put(`/v3/users/${admin_id}/password`)
        .send({
          new_password: "newPassword",
          new_password_confirm: "newPassword",
        })
        .set("Authorization", `Bearer ${new_user_jwt}`);

      expect(status).to.equal(403);
    });
  });

  describe("DELETE /v3/users/:user_id", () => {
    it("Should not allow unauthenticated user deletion", async () => {
      const { status } = await request(app).delete(`/v3/users/${new_user_id}`);
      expect(status).to.equal(401);
    });

    it("Should allow user deletion", async () => {
      const { status } = await request(app)
        .delete(`/v3/users/${new_user_id}`)
        .set("Authorization", `Bearer ${admin_jwt}`);
      expect(status).to.equal(200);
    });
  });
});
