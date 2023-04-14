"use strict";
const fp = require("fastify-plugin");
const { readFileSync } = require("fs");
const path = require("path");
const moment = require("moment");
var randToken = require("rand-token");
const { ACCOUNT_DOESNT_EXIST } = require("../config/errors.json");

module.exports = fp(async function (fastify, opts) {
  fastify.register(require("@fastify/jwt"), {
    secret: {
      private: readFileSync(
        `${path.join(opts.rootDir, "certificates")}/private.pem`,
        "utf8"
      ),
      public: readFileSync(
        `${path.join(opts.rootDir, "certificates")}/public.crt`,
        "utf8"
      ),
    },
    sign: {
      algorithm: "RS256",
      expiresIn: `${process.env.JWT_EXPIRY}d`, // JWT EXPIRY IN DAYS 'd' , 'h' for hours
      audience: "sketch-backend",
      issuer: "ounlabs.com",
    },
    verify: {
      audience: "sketch-backend",
      issuer: "ounlabs.com",
    },
  });

  fastify.decorate("jwtsign", async function (data, device_id, lang) {
    try {
      let language = lang ? lang : "en";
      // Throwing error incase email does not exist
      if (!data.email) {
        throw new Error("email required!");
      }
      if (!device_id) {
        throw new Error("Device ID required!");
      }

      // FIND IF THE USER IS ACTIVE
      let user = await fastify.db.User.findOne({
        where: { email: data.email, user_status: true },
        attributes: ["email", "user_status"],
      });

      if (!user) {
        return {
          statusCode: 401,
          message: ACCOUNT_DOESNT_EXIST[language],
        };
      }

      // Updating the user activity if the user exists
      fastify.db.User.update(
        { last_activity: new Date() },
        { where: { email: data.email } }
      );

      const access_token = fastify.jwt.sign(data);
      const refresh_token = randToken.uid(256);

      // SAVING ACCESS TOKEN WITH EXPIRY FROM ENV
      let expiry = moment().add(process.env.JWT_EXPIRY, "days");
      await fastify.db.Token.create({
        email: data.email,
        token_type: "ACCESS",
        token: access_token,
        token_expiry: expiry,
        device_fingerprint: device_id,
      });

      // SAVING THE REFRESH TOKEN WITH EXPIRY
      let refresh_expiry = moment().add(process.env.JWT_EXPIRY_REFRESH, "days");
      await fastify.db.Token.create({
        email: data.email,
        token_type: "REFRESH",
        token: refresh_token,
        token_expiry: refresh_expiry,
        device_fingerprint: device_id,
      });

      console.log("JWT TOKEN GENERATED FOR: ", data.email);
      return {
        statusCode: 202,
        message: "Token generated successfully",
        access_token: access_token,
        refresh_token: refresh_token,
      };
    } catch (err) {
      return err;
    }
  });
});
