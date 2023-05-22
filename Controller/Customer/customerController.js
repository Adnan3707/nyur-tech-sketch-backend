// Server Errors 
const { where } = require('sequelize');
const moment = require('moment');
const crypto = require("crypto");
const Sequelize = require('sequelize');
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
  const authorizationHeader = request.headers.authorization;
  let token ;
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

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            // Bearer token is missing
        let user = await fastify.db.User.findOne({
          where:{
            email:request.body.email
          }
        })
        let passwordCheck = user.validatePassword(request.body.email,request.body.password,user.password)
        if(passwordCheck ){
          token = await validators.Token({email:request.body.email}, request.body.device_id, language,fastify) 
          reply.code(200);
          resp = {
            statusCode: 200,
            message: 'Login Success Using Email & Password:-'+ request.body.email,
            data: {
              access_token: token.access_token,
              refresh_token: token.refresh_token,
            },
          };
          return resp;
        }
        throw new AppError('Wrong Email oR Password',220)
}


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
     token = await validators.Token(payload, payload.device_id, language,fastify)

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
      message: 'Login Success Using Token For :-'+ payload.email,
      data: {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
      },
    };
    return resp;


}

const recover = async function(request,reply,fastify){
    let language = request.headers["accept-language"]
    ? request.headers["accept-language"]
    : "en";
   let resp;
      let email = request.body.email
      let user = await fastify.db.User.findOne({
        where: {
          email
        }
      });
      if(!user) throw new AppError('User Does Not Exists',400)
     user.generatePasswordReset();
     // Testing Only
     let link  ;
     // Save Reset Token And Expiery To DataBase
    try{
        await  user.save()
      // Send Email To User Mail
        await fastify.send(user.resetPasswordToken,request,request).then((suc)=>{
        link = "http://" + request.headers.host + "/change?token="+user.resetPasswordToken 
        console.log(link)
      }) 
    }catch{
      throw new AppError('Error In Generating Link',400)
    }
    resp = {
      statusCode: 200,
      message: "Email Sent To User",
    };
    return resp
}
const changePassword = async function(request,reply,fastify){
  let data = request.body;
let resp ;
let language = request.headers["accept-language"]
? request.headers["accept-language"]
: "en";
logs = {
  // email: request.body.email,
  action: "changePassword",
  url: "/changePassword",
  request_header: JSON.stringify(request.headers),
  request: JSON.stringify(request.body),
  axios_request: "",
  axios_response: "",
};
   let {token} = request.query ;
    if(request.body.password !== request.body.confirmPassword) throw new AppError('Password and confirm dosent match ',202)
  // let UserCheck =  await validators.UserCheck(language,logs,request,fastify)
    if(validators.PasswordSyntaxCheck(request.body.password)) throw new AppError('Password Syntax Error',202)
    let user = await fastify.db.User.findOne({
      where:{
        resetPasswordToken: token
      }
        })
        // Check Token
      if(user.resetPasswordToken !== token) throw new AppError('Token Error',400)
    if(user){
      
            // Assuming the given date is represented as a number (timestamp)
            let givenDate = user.resetPasswordExpires // Example timestamp
            var isBefore1Hours  
            givenDate > (Date.now() - (60 * 60 * 1000)) ? isBefore1Hours = true :  isBefore1Hours = false
    }
    if(isBefore1Hours){
      console.log('Entered Change Password')
      user.password= crypto
      .pbkdf2Sync(request.body.password, user.email, 1000, 64, "sha512")
      .toString("hex");
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
    await user.save();
    resp = {
      statusCode: 200,
      message: "Password Change Successfully",
    };
    return resp;
    }
    throw new AppError('Error In Change Your Password',404)
  }
module.exports = {
    customerRegister,login,recover,changePassword
}