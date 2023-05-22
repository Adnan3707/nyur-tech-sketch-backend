"use strict";
const fp = require("fastify-plugin");
const Bearer = require("permit").Bearer;
// const Basic = require("permit").Basic;
const moment = require("moment");
const {
  USER_ACCOUNT_DISABLED,
  AUTHENTICATION_INVALID,
  ACCOUNT_DOESNT_EXIST,
} = require("../config/errors.json");
const AppError = require('../Error Handler/appError')

module.exports = fp(async function (fastify, opts) {
  const permit = new Bearer();

  fastify
    .decorate("authorize", async function (request, reply) {
      // console.log("=======BODY=======", request.body);
      var message,
        language = request.headers["accept-language"]
          ? request.headers["accept-language"]
          : "en";

      // Finding the Bearer Token in Authorization Header
      const token = permit.check(request.raw);
      console.log("==================TOKEN", token);

      // No token found, so ask for authentication.
      if (!token) {
        console.log("AUTHORIZE: NO TOKEN FOUND");
        // permit.fail(reply.raw);
        // return "AUTHORIZE: NO TOKEN FOUND"
        throw new AppError("Authorization required!",210);
      }

      // Verifying the authenticity of the Token
      const jwt_payload = await request.jwtVerify();
      const user = await fastify.db.User.findOne({
        where: {
          email: jwt_payload.email,
        },
        attributes: ["user_status"],
      });

      if (!user) {
        console.log("BASIC AUTH: USER DOES NOT EXIST");
        message = language
          ? ACCOUNT_DOESNT_EXIST[language]
          : ACCOUNT_DOESNT_EXIST.en;
        // permit.fail(reply.raw);
        // return message
        throw new AppError(message, ACCOUNT_DOESNT_EXIST[code]);
      }
      if (!user.user_status) {
        console.log("USER BLOCKED OR DISABLED: User account has been disabled");
        // permit.fail(reply.res);
        message = language
          ? USER_ACCOUNT_DISABLED[language]
          : USER_ACCOUNT_DISABLED.en;
        reply.code(405);
        // return message
        throw new AppError(message,USER_ACCOUNT_DISABLED[code]);
      }

      console.log("=============", jwt_payload);

      //CHECKING FOR THE BODY FORMAT
      if (!request.body) {
        permit.fail(reply.raw);
        // return message
        throw new AppError("Invalid Form Body",210);
      }

      //CHECKING FOR THE DEVICE ID PARAM
      if (!request.body.device_id) {
        console.log(
          "CUSTOMER AUTHORIZE: " + jwt_payload.email + " DEVICE ID MISSING"
        );
        // permit.fail(reply.raw);
        // return message
        throw new AppError("body should have required property 'device_id'",210);
      }

      // Double Checking the Token Identification from DB
      const token_data = await fastify.db.Token.findOne({
        where: {
          token: token,
          email: jwt_payload.email,
          device_fingerprint: request.body.device_id,
        },
        attributes: ["email", "token_expiry"],
      });

      // IF NOT RECORD FOUND IN DB
      if (!token_data) {
        console.log(
          "AUTHORIZE: " + jwt_payload.email + " TOKEN NOT AVAILABLE IN DATABASE"
        );
        message = language
          ? AUTHENTICATION_INVALID[language]
          : AUTHENTICATION_INVALID.en;
        // permit.fail(reply.raw);
        // return message
        throw new AppError(message,AUTHENTICATION_INVALID.code);
      }

      // CHECKING TOKEN VALIDITY
      let now = moment(new Date()); // todays date/time
      let end = moment(token_data.token_expiry); // expiry date/time
      let duration = moment.duration(end.diff(now));
      let expiry_minutes = duration.asMinutes();

      if (expiry_minutes < 0) {
        console.log(
          "AUTHORIZE: " +
            " TOKEN EXPIRED IN THE DATABASE FOR " +
            jwt_payload.email
        );
        permit.fail(reply.raw);
        // return "AUTHORIZE: " + " TOKEN EXPIRED IN THE DATABASE FOR " + jwt_payload.email
        throw new AppError("Signed authorization token expired",210);
      }

      // TOKEN VALIDITY CHECK ENDS

      console.log(
        "AUTHORIZE: " + jwt_payload.email + " AUTHORIZED SUCCESSFULLY"
      );

      // UPDATING LAST ACTIVITY OF THE USER
      fastify.db.User.update(
        { last_activity: new Date() },
        { where: { email: jwt_payload.email } }
      );

      // Authentication succeeded, save the context and proceed...
      request.user = jwt_payload;
      return request
    })
    .register(require("@fastify/auth"));
});
