const validator = {
    PasswordCheck :async function(term){
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

} 
}
module.exports =  validator