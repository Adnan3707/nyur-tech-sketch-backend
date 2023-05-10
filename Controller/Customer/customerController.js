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
  console.log('Catch async error')
    return (req,res,next)=>{
        fn(req,res,next).catch(next)
    }
}

const customerRegister = catchAsync( async function (request, reply , fastify) {
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
          // Check If User Exists 
        validators.UserCheck(fastify,{ email: data.email })

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
        let token = validators.Token(payload, data.device_id, language,fastify)

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
        console.error('catch error');
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
)

module.exports = {
    customerRegister
}