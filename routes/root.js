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
  fastify.setErrorHandler(function (error, request, reply) {
    console.log('*********Error Handling Middleware')
  //  console.log(error)
   
   // Admin Handler Code:- 20X
   if(error.statusCode == 201 ){ 
    console.log(error)
    reply.send('Plz Contact admin');
   }
   // Token Error OR Wrong Details Code:- 2X0
   if(error.statusCode == 210 || 401 ){ 
    console.log(error)
    reply.send('Login using UserName and Password');
   }
   // No User Found Code:- 30X
   if(error.statusCode == 300 ){ 
    console.log(error)
    reply.send('No Email Found , New Registration Required');
   }
  });
  var {customerRegister,login} = require('../Controller/Customer/customerController')

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
    return  customerRegister(req,reply,fastify)
    }

  );
  fastify.post('/login',{},(req,reply)=>{
    return login(req,reply,fastify)
  })

};
