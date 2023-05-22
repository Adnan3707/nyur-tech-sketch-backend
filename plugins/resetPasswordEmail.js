"use strict";
// require("dotenv").config();
const fp = require("fastify-plugin");
const fastifyMailer = require('fastify-mailer')

module.exports = fp(async function (fastify, opts) {
    fastify.register(fastifyMailer, {
        defaults: {
          // set the default sender email address to jane.doe@example.tld
          from: 'adnanfarooq37@gmail.com',
          // set the default email subject to 'default example'
          subject: 'Sketch Support',
        },
        transport: {
          host: 'smtp.sendgrid.net',
          auth: {
            user: process.env.SENDGRID_USER,
            pass: process.env.SENDGRID_API_KEY
          }
        }
      })
      fastify.decorate('send',async(token,request,reply)=>{
        let link = "http://" + request.headers.host + "/change?token="+token
        let mailOptions = {
              to:request.body.email,
              from:'adnanfarooq37@gmail.com',
              subject: "Password change request",
              text:`Hi ${request.body.email} \n 
              Please click on the following link ${link} to reset your password. \n\n 
              If you did not request this, please ignore this email and your password will remain unchanged.\n`,
              };
            try {
              await fastify.mailer.sendMail(mailOptions)
              return {
                statusCode: 202,
                message: "Email Sent Successfully",
              }
            }catch(error){
          return error
            }
      })
})

