"use strict";

require("dotenv").config();

const Fastify = require("fastify");

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

// Registering application as a normal plugin.
app.register(require("./app.js"));

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
let config = { port: process.env.PORT || 3000, host: "0.0.0.0" };

// Start listening.
const start = async () => {
  try {
    await app.listen(config);
    console.log("Server listening at " + config.port);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
