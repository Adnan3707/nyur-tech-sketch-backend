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

  var {customerRegister} = require('../Controller/Customer/customerController')

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
    // },customerController.customerRegister
    },(req,reply)=>{
     return customerRegister(req,reply,fastify)
    }

  );
  fastify.post('/login',{},(req,reply)=>{
    return
  })
};
