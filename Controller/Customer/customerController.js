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

const AppError = require('../../Error Handler/appError')

const validators = require('../../Validators/validators')


const customerRegister =  async function (request, reply , fastify) {
      let language = request.headers["accept-language"]
        ? request.headers["accept-language"]
        : "en";
      let data = request.body;
      let resp ;
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
    let passwordError = validators.PasswordSyntaxCheck(request.body.password) 
    let UserCheck =  await validators.UserCheck(language,logs,request,fastify)
      if(passwordError){
        throw new AppError(passwordError.message,passwordError.statusCode)
      }
      if(UserCheck){
        throw new AppError(UserCheck.message,UserCheck.statusCode)
      }


      try {
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
        let token =  validators.Token(payload, data.device_id, language,fastify)

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
        console.log(err)
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
const login = async function(request,reply,fastify){
  
  let language = request.headers["accept-language"]
  ? request.headers["accept-language"]
  : "en";
  let resp,
  
  logs = {
    action: "Login",
    url: "/login",
    request_header: JSON.stringify(request.headers),
    request: JSON.stringify(request.body),
    axios_request: "",
    axios_response: "",
  };

    let payload = {
      email: '',
      device_id: ''
    };

    // JWT Token Check - In From DataBase
    await fastify.authorize(request).then((response)=>{
    payload.email = response.user.email;
    payload.device_id = response.body.device_id
    })

    // Update Token
    let token = await validators.Token(payload, payload.device_id, language,fastify)

    if (token.statusCode != 202) {
      // logs.response = JSON.stringify(token);
      // logs.status = "FAILURE";
      await fastify.db.audit_trail.create(logs);
      reply.code(token.statusCode || 401);
      // return token;
      throw new AppError('Token Error',210)
    }
    reply.code(200);
    resp = {
      statusCode: 200,
      message: 'Login Success :-'+ payload.email,
      data: {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
      },
    };
    return resp;


}

module.exports = {
    customerRegister,login
}