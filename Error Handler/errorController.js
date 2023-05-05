// const fastify = require("fastify");

// module.exports = (err,req,res,next) => {
//  err.statusCode = err.statusCode || 500 ;
//  err.status = err.status || 'error' ;
//  res.status(err.statusCode).json({
//     status: err.status,
//     message:err.message
//  })
// }


// module.exports = function errorcontroller(fastify){
// return fastify.addHook('onError', (request, reply, error, next) => {
//    console.log(error)
//   reply.status(500).send({
//     message: 'Internal Server Error'
//   })
// })
// }

module.exports = function (error, request, reply) {
  if (error.myCustomError) {
    reply
      .status(error.statusCode || 500)
      .send({
        error: statusCodes[error.statusCode || 500],
        message: error.message,
        myCustomError: error.myCustomError,
        statusCode: error.statusCode || 500
      })
  } else {
    reply.send(error) // fallback to the default serializer
  }
}
