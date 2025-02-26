"use strict";

const fp = require("fastify-plugin");

module.exports = fp(
  async function (fastify) {
    fastify.register(require("@fastify/cors"), {
      origin: true,
      credentials: true,
    });
  },
  { name: "cors" },
);
