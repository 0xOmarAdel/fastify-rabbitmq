const fp = require("fastify-plugin");
const rabbitMQPlugin = require("fastify-rabbitmq");

module.exports = fp(
  async function (fastify) {
    // @ts-ignore
    fastify.register(rabbitMQPlugin, {
      connection: process.env.RABBITMQ_CONNECTION,
    });

    fastify.ready().then(async () => {
      const publisher = fastify.rabbitmq.createPublisher({
        confirm: true,
        maxAttempts: 1,
        exchanges: [
          {
            exchange: process.env.RABBITMQ_EXCHANGE,
            durable: true,
            autoDelete: false,
            type: "topic",
          },
        ],
      });

      // Decorate the Fastify instance so routes can use the publisher
      fastify.decorate("rabbitmqPublisher", publisher);
    });
  },
  { name: "rabbitmq" }
);
