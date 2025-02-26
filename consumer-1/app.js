"use strict";

const path = require("path");
const AutoLoad = require("@fastify/autoload");

module.exports.options = {};

module.exports = async function (fastify, opts) {
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
    options: Object.assign({}, opts),
  });
};
