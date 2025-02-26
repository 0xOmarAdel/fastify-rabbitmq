"use strict";

const { faker } = require("@faker-js/faker");

/** @param {import("fastify").FastifyInstance} fastify */
module.exports = async function (fastify) {
  fastify.post(`/`, {}, async function (_, reply) {
    const fakeUser = {
      id: faker.string.uuid(),
      username: faker.internet.username(),
      email: faker.internet.email(),
      createdAt: new Date().toISOString(),
    };

    const fakeCountry = {
      id: faker.string.uuid(),
      country: faker.location.country(),
      city: faker.location.city(),
    };

    Promise.all([
      // @ts-ignore
      fastify.rabbitmqPublisher.send(
        { exchange: process.env.RABBITMQ_EXCHANGE, routingKey: "users" },
        fakeUser
      ),
      // @ts-ignore
      fastify.rabbitmqPublisher.send(
        { exchange: process.env.RABBITMQ_EXCHANGE, routingKey: "countries" },
        fakeCountry
      ),
    ]);

    reply.send({ user: fakeUser, country: fakeCountry });
  });
};
