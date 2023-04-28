"use strict";

const fs = require("fs");
const path = require("path");
const moment = require("moment");
const Sequelize = require("sequelize");
const env = process.env.NODE_ENV || "DEVELOPMENT";
const endpoints = require("../config/endpoints")[env];
const Op = Sequelize.Op;

const {
  ACCOUNT_EXISTS,
  AUTHENTICATION_INVALID,
  ACCOUNT_DOESNT_EXIST,
  ACCOUNT_DETAILS_WRONG,
  USER_ACCOUNT_DISABLED,
  SIGN_UP_SUCCESS,
  SERVER_ERROR,
  RECOVER_SUCCESS,
  DEVICE_DOESNT_EXIST,
  AUTHENTICATION_SUCCESS,
} = require("../config/errors.json");

module.exports = async function (fastify, opts) {
  fastify.post(
    "/register",
    {
      schema: {
        description: "Register Account",
        summary: "Register Account",
        tags: ["JWT"],
        body: {
          $ref: "register#",
        },
      },
    },
    async function (request, reply) {
      let language = request.headers["accept-language"]
        ? request.headers["accept-language"]
        : "en";
      let data = request.body;
      let resp,
        logs = {
          email: request.body.email,
          action: "Register",
          url: "/register",
          request_header: JSON.stringify(request.headers),
          request: JSON.stringify(request.body),
          axios_request: "",
          axios_response: "",
        };

      // CHECKING PASSWORD REGEX FORMAT MATCH
      var term = data.password;

      // FOR SPECIAL CHAR CHECK
      var format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
      if (format.test(term)) {
        resp = {
          statusCode: 200,
          message: "Password should not contain special characters",
        };
        return resp;
      }

      // FOR UPPER CASE LOWERCASE AND 1 NUMBER
      var re = new RegExp("^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$");
      if (!re.test(term)) {
        resp = {
          statusCode: 200,
          message: "Password should have 1 uppercase, 1 lowercase & a number",
        };
        return resp;
      }
      // CHECKING PASSWORD REGEX ENDS

      try {
        // GETTING USER
        let user = await fastify.db.User.findOne({
          where: {
            email: data.email,
          },
        });

        // CHECKING USER IF ALREADY EXISTS
        if (user) {
          resp = {
            statusCode: 400,
            message: ACCOUNT_EXISTS[language],
          };
          logs.response = JSON.stringify(resp);
          logs.status = "FAILURE";
          await fastify.db.audit_trail.create(logs);
          reply.code(400);
          return resp;
        }
        // CHECKING USER ENDS

        // BLOCKING EXCHANGE INTEGRATION FOR DEVELOPMENT
        if (process.env.NODE_ENV != "DEVELOPMENT") {
          // PAYLOAD TO SIGN
          let exchange_payload = {
            email: data.email,
            password: data.password,
            ip: request.ip,
            device: "web",
            appKey: process.env.APP_KEY,
          };

          // GENERATING SIGNATURE
          let signature = await fastify.exchangeSign(exchange_payload);
          // APPENDING SIGNED SIGNATURE
          exchange_payload.sign = signature;

          // SENDING REQUEST TO EXCHANGE TO GENERATE UID
          const getUID = await fastify.axios.post(
            endpoints.exchange_login_register,
            exchange_payload
          );
          console.log(JSON.stringify(getUID.data, null, 2));

          // INCASE EXCHANGE API FAILS DUE TO SOME REASON
          if (getUID.data.code != "0") {
            console.error("EXCHANGE ERROR", getUID.data);
            resp = {
              statusCode: 403,
              message: getUID.data.msg,
            };
            logs.response = JSON.stringify(resp);
            logs.status = "FAILURE";
            await fastify.db.audit_trail.create(logs);
            reply.code(403);
            return resp;
          }

          // APPENDING EXCHANGE DATA TO THE FINAL SIGNUP DATA
          data.uid = getUID.data.data.uid;
          data.invite_code = getUID.data.data.inviteCode;
        }
        // BLOCKING EXCHANGE FOR DEVELOPMENT ENDS

        // HASHING THE PASSWORD
        let hashedPassword = fastify.db.User.setPassword(
          data.email,
          data.password
        );
        data.password = hashedPassword;
        // HASHING PASSWORD ENDS

        // CREATING NEW USER
        await fastify.db.User.create(data);

        // Making JWT Payload
        let payload = {
          email: data.email,
        };

        // Generating Token
        let token = await fastify.jwtsign(payload, data.device_id, language);

        // Checking Response from JWT SIGN Plugin
        if (token.statusCode != 202) {
          logs.response = JSON.stringify(token);
          logs.status = "FAILURE";
          await fastify.db.audit_trail.create(logs);
          reply.code(token.statusCode || 401);
          return token;
        }

        // CREATING DEVICE DETAILS
        let deviceDetails = {
          device_id: data.device_id,
          email: data.email,
          phone_number: request.body.phone_number,
        };
        await fastify.db.Device.create(deviceDetails);
        // CREATING DEVICE DETAIL ENDS

        reply.code(200);
        resp = {
          statusCode: 200,
          message: SIGN_UP_SUCCESS[language],
          data: {
            registered_device: data.device_id,
            access_token: token.access_token,
            refresh_token: token.refresh_token,
          },
        };
        logs.response = JSON.stringify(resp);
        logs.status = "SUCCESS";
        await fastify.db.audit_trail.create(logs);
        return resp;
      } catch (err) {
        console.error(err);
        resp = {
          statusCode: 400,
          message: SERVER_ERROR[language],
        };
        logs.response = JSON.stringify(resp);
        logs.status = "FAILURE";
        await fastify.db.audit_trail.create(logs);
        reply.code(400);
        return resp;
      }
    }
  );
};
