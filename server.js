"use strict";

require("dotenv").config();

var Fastify = require("fastify");
var errorController = require('./Error Handler/errorController');
const fastify = require("fastify");
const AppError = require("./Error Handler/appError");
// const fastify = require("fastify");

const envToLogger = {
  DEVELOPMENT: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
  PRODUCTION: true,
};

// Fastify Config
const app = Fastify({
  logger: envToLogger[process.env.NODE_ENV],
  pluginTimeout: 10000,
  onProtoPoisoning: "remove",
  bodyLimit: 10485760, // DEFAULT 1048576 BYTES,
  trustProxy: true,
});

// Error Handler
  const Allowed_URL = ["/register" , "/","/recover","/change","/profile"]
  const Allowed_Method = ['POST']
   // Request Error
  fastify.addHook('onRequest', (request, reply, next) => {
    const { raw: { url, method } } = request
  if (Allowed_URL.includes(url) && Allowed_Method.includes(method)) {
    // Continue with the request lifecycle if the requested route exists
    return next()
  }
  // Throw an error if the requested route doesn't exist
  const error = new AppError('Route not found',404)
  error.statusCode = 404
  next(error)
})

fastify.addHook('onError', async (request, reply, error) => {
  console.log("***************Error Hook")
  // Useful for custom error logging
  // You should not use this hook to update the error
})

// fastify.use(errorHandler)




// Registering application as a normal plugin.
app.register(require("./app.js"));

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;


let config = { port: process.env.PORT || 5000, host: "0.0.0.0" };
console.log(process.env.PORT)

// Start listening.
app.listen(config);
const start = async () => {
  try {
    await app.listen(config);
    console.log("Server listening at " + config.port)
  } catch (err) {
    console.log("Enetred error")
    app.log.error(err);
    process.exit(1);
  }
};

start();
