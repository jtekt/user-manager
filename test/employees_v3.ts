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

    it("Should return the correct response shape", async () => {
      const { status, body } = await request(app)
        .get("/v3/users/")
        .set("Authorization", `Bearer ${admin_jwt}`);

      expect(status).to.equal(200);
      expect(body).to.have.property("users").that.is.an("array");
      expect(body).to.have.property("count").that.is.a("number");
      expect(body).to.have.property("batch_size");
      expect(body).to.have.property("start_index");
    });

    it("Should respect the batch_size pagination parameter", async () => {
      const { status, body } = await request(app)
        .get("/v3/users/?batch_size=1&start_index=0")
        .set("Authorization", `Bearer ${admin_jwt}`);

      expect(status).to.equal(200);
      expect(body.users).to.have.lengthOf(1);
    });

    it("Should reject an invalid order parameter", async () => {
      const { status } = await request(app)
        .get("/v3/users/?order=RANDOM")
        .set("Authorization", `Bearer ${admin_jwt}`);

      expect(status).to.equal(400);
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

    it("Should reject creation without email_address or username", async () => {
      const { status } = await request(app)
        .post("/v3/users/")
        .send({ password: "banana" })
        .set("Authorization", `Bearer ${admin_jwt}`);

      expect(status).to.equal(400);
    });

    it("Should reject creation with mismatched password_confirm", async () => {
      const { status } = await request(app)
        .post("/v3/users/")
        .send({
          email_address: "mismatch@test.com",
          password: "banana",
          password_confirm: "notbanana",
        })
        .set("Authorization", `Bearer ${admin_jwt}`);

      expect(status).to.equal(400);
    });

    it("Should reject creation with a password containing invalid characters", async () => {
      const { status } = await request(app)
        .post("/v3/users/")
        .send({ email_address: "test@test.com", password: "b@n@n@!" })
        .set("Authorization", `Bearer ${admin_jwt}`);

      expect(status).to.equal(400);
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

    it("Should not allow login with wrong password", async () => {
      const { status } = await request(app)
        .post("/v3/auth/login")
        .send({ ...new_user, password: "wrongpassword" });
      expect(status).to.equal(403);
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

    it("Should prevent non-admin from setting isAdmin", async () => {
      const { status } = await request(app)
        .patch(`/v3/users/${new_user_id}/`)
        .send({ isAdmin: true })
        .set("Authorization", `Bearer ${new_user_jwt}`);

      expect(status).to.equal(403);
    });

    it("Should allow admin to set admin-only fields on another user", async () => {
      const { status } = await request(app)
        .patch(`/v3/users/${new_user_id}/`)
        .send({ isAdmin: false, locked: false })
        .set("Authorization", `Bearer ${admin_jwt}`);

      expect(status).to.equal(200);
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

    it("Should reject mismatched new_password_confirm", async () => {
      const { status } = await request(app)
        .put(`/v3/users/${new_user_id}/password`)
        .send({
          new_password: "newPassword",
          new_password_confirm: "differentPassword",
        })
        .set("Authorization", `Bearer ${new_user_jwt}`);

      expect(status).to.equal(400);
    });

    it("Should reject a password that is too short", async () => {
      const { status } = await request(app)
        .put(`/v3/users/${new_user_id}/password`)
        .send({ new_password: "abc", new_password_confirm: "abc" })
        .set("Authorization", `Bearer ${new_user_jwt}`);

      expect(status).to.equal(400);
    });
  });

  describe("/:user_id/token", () => {
    let retrieved_token: string;

    describe("GET /v3/users/:user_id/token", () => {
      it("Should not allow non-admin to get another user's token", async () => {
        const { status } = await request(app)
          .get(`/v3/users/${admin_id}/token`)
          .set("Authorization", `Bearer ${new_user_jwt}`);

        expect(status).to.equal(403);
      });

      it("Should allow a user to get their own token", async () => {
        const { status, body } = await request(app)
          .get(`/v3/users/${new_user_id}/token`)
          .set("Authorization", `Bearer ${new_user_jwt}`);

        retrieved_token = body.jwt;
        expect(status).to.equal(200);
        expect(body).to.have.property("jwt").that.is.a("string");
      });

      it("Should allow admin to get another user's token", async () => {
        const { status } = await request(app)
          .get(`/v3/users/${new_user_id}/token`)
          .set("Authorization", `Bearer ${admin_jwt}`);

        expect(status).to.equal(200);
      });
    });

    describe("POST /v3/users/:user_id/token", () => {
      it("Should reject a missing token body", async () => {
        const { status } = await request(app)
          .post(`/v3/users/${new_user_id}/token`)
          .send({})
          .set("Authorization", `Bearer ${admin_jwt}`);

        expect(status).to.equal(400);
      });

      it("Should reject an invalid token", async () => {
        const { status } = await request(app)
          .post(`/v3/users/${new_user_id}/token`)
          .send({ token: "invalid.jwt.token" })
          .set("Authorization", `Bearer ${admin_jwt}`);

        expect(status).to.equal(403);
      });

      it("Should decode a valid token", async () => {
        const { status, body } = await request(app)
          .post(`/v3/users/${new_user_id}/token`)
          .send({ token: retrieved_token })
          .set("Authorization", `Bearer ${admin_jwt}`);

        expect(status).to.equal(200);
        expect(body).to.have.property("user_id");
      });
    });

    describe("DELETE /v3/users/:user_id/token", () => {
      it("Should not allow non-admin to revoke another user's token", async () => {
        const { status } = await request(app)
          .delete(`/v3/users/${admin_id}/token`)
          .set("Authorization", `Bearer ${new_user_jwt}`);

        expect(status).to.equal(403);
      });

      it("Should allow a user to revoke their own token", async () => {
        const { status } = await request(app)
          .delete(`/v3/users/${new_user_id}/token`)
          .set("Authorization", `Bearer ${new_user_jwt}`);

        expect(status).to.equal(200);
      });

      it("Should reject the revoked token on subsequent requests", async () => {
        const { status } = await request(app)
          .get(`/v3/users/${new_user_id}`)
          .set("Authorization", `Bearer ${new_user_jwt}`);

        expect(status).to.equal(401);
      });
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
