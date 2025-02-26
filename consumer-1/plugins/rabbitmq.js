const fp = require("fastify-plugin");
const rabbitMQPlugin = require("fastify-rabbitmq");

module.exports = fp(
  async function (fastify) {
    let connectionEstablished = false;

    // @ts-ignore
    await fastify.register(rabbitMQPlugin, {
      connection: process.env.RABBITMQ_CONNECTION,
    });

    fastify.rabbitmq.once("connection", () => {
      connectionEstablished = true;
      fastify.log.info("RabbitMQ connected");
    });

    fastify.rabbitmq.on("error", (err) => {
      fastify.log.error(
        `RabbitMQ connection error: ${JSON.stringify(err, null, 2)}`
      );
    });

    fastify.ready().then(async () => {
      const consumer = fastify.rabbitmq.createConsumer(
        {
          queue: "q.consumer-1",
          queueOptions: { durable: true },
          queueBindings: [
            { exchange: process.env.RABBITMQ_EXCHANGE, routingKey: "users" },
          ],
        },
        async (msg) => {
          fastify.log.info(`Received message: ${JSON.stringify(msg, null, 2)}`);
        }
      );

      fastify.log.info(
        `Consumer stats: ${JSON.stringify(consumer.stats, null, 2)}`
      );

      consumer.on("error", (err) => {
        fastify.log.error(`Consumer error: ${JSON.stringify(err, null, 2)}`);
      });
    });
  },
  { name: "rabbitmq" }
);
