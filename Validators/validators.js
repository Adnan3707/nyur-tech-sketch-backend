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
} = require('../config/errors.json')

const validator = {
  PasswordSyntaxCheck :async function(term){
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

},
  UserCheck: async function(language,logs,request,fastify,condition){
    if (condition.hasOwnProperty('password')) {
      let user = await fastify.db.User.findOne({
        where: condition
      });
      console.log(user)
      await fastify.db.User.findOne({ where: { username: username } }).then(function (user) {
        if (!user) {
            // res.redirect('/login');
            console.log("User Not Found")
            return
        } else if (!user.validPassword(password)) {
          console.log("Invalid Password")
          return
        } else {
          console.log("Login Successful")
          return
        }
    });
    }
       // GETTING USER
       let user = await fastify.db.User.findOne({
        where: condition
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
  //  throw new AppError(ACCOUNT_EXISTS[language],400)
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
  },
  Token: async function(payload, device_id, language,fastify){
    return await fastify.jwtsign(payload, device_id, language);
  },
  VerifyToken: async function(token, device_id){
    jwt.verify(token,  device_id, (err, user) => {
      if (err) { 
       res.status(403).send("Token invalid")
       }
       else {
       req.user = user
       next() //proceed to the next action in the calling function
       }
      }
    )
  },
  
}
module.exports =  validator