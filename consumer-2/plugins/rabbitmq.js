const fp = require("fastify-plugin");
const rabbitMQPlugin = require("fastify-rabbitmq");

module.exports = fp(
  async function (fastify) {
    // @ts-ignore
    fastify.register(rabbitMQPlugin, {
      connection: process.env.RABBITMQ_CONNECTION,
    });

    fastify.ready().then(async () => {
      fastify.rabbitmq.createConsumer(
        {
          queue: "q.consumer-2",
          queueOptions: { durable: true },
          queueBindings: [
            { exchange: process.env.RABBITMQ_EXCHANGE, routingKey: "users" },
            {
              exchange: process.env.RABBITMQ_EXCHANGE,
              routingKey: "countries",
            },
          ],
        },
        async (msg) => {
          console.log("Received message:", msg);
        }
      );
    });
  },
  { name: "rabbitmq" }
);
