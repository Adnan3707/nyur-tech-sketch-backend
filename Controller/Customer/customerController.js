// Server Errors 
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
} = require('../../config/errors.json')

const statusCodes = require('http').STATUS_CODES
const AppError = require('../../Error Handler/appError')
// var fastify = require("fastify");

const validators = require('../../Validators/validators')

const catchAsync=fn =>{
    return (req,res,next)=>{
        fn(req,res,next).catch(next)
    }
}

const customerRegister =  async function (request, reply , fastify) {
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
     validators.PasswordCheck(term)
      try {
        // GETTING USER
        let user = await fastify.db.User.findOne({
          where: {
            email: data.email,
          },
        });

        // CHECKING USER IF ALREADY EXISTS
        if (user) {
          logs.response = JSON.stringify(resp);
          logs.status = "FAILURE";
          await fastify.db.audit_trail.create(logs);
        resp = {
          statusCode: 400,
          message: ACCOUNT_EXISTS[language]
            }
            return resp
     throw new AppError(ACCOUNT_EXISTS[language],400)
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


module.exports = {
    customerRegister
}