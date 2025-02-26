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
      const dlxPublisher = fastify.rabbitmq.createPublisher({
        exchanges: [
          {
            exchange: "dlx.consumer-2",
            type: "direct",
            durable: true,
          },
        ],
      });

      const dlqConsumer = fastify.rabbitmq.createConsumer(
        {
          queue: "dlq.consumer-2",
          queueOptions: { durable: true },
          queueBindings: [
            { exchange: "dlx.consumer-2", routingKey: "message.failed" },
          ],
          noAck: false,
        },
        async (msg) => {
          fastify.log.warn(
            `DLQ message received: ${JSON.stringify(msg, null, 2)}`
          );
          return true;
        }
      );

      const consumer = fastify.rabbitmq.createConsumer(
        {
          queue: "q.consumer-2",
          queueOptions: {
            durable: true,
            arguments: {
              "x-dead-letter-exchange": "dlx.consumer-2",
              "x-dead-letter-routing-key": "message.failed",
            },
          },
          queueBindings: [
            { exchange: process.env.RABBITMQ_EXCHANGE, routingKey: "users" },
            {
              exchange: process.env.RABBITMQ_EXCHANGE,
              routingKey: "countries",
            },
          ],
          noAck: false,
        },
        async (msg) => {
          try {
            fastify.log.info(
              `Received message: ${JSON.stringify(msg, null, 2)}`
            );
            return true;
          } catch (error) {
            fastify.log.error(`Error processing message: ${error.message}`);
            return false;
          }
        }
      );

      fastify.log.info(
        `Consumer stats: ${JSON.stringify(consumer.stats, null, 2)}`
      );

      consumer.on("error", (err) => {
        fastify.log.error(`Consumer error: ${JSON.stringify(err, null, 2)}`);
      });

      dlqConsumer.on("error", (err) => {
        fastify.log.error(
          `DLQ Consumer error: ${JSON.stringify(err, null, 2)}`
        );
      });
    });

    fastify.addHook("onClose", async (instance, done) => {
      try {
        fastify.log.info("Closing RabbitMQ connection...");
        await fastify.rabbitmq.close();
        fastify.log.info("RabbitMQ connection closed successfully");
        done();
      } catch (error) {
        fastify.log.error(
          `Error closing RabbitMQ connection: ${error.message}`
        );
        done(error);
      }
    });
  },
  { name: "rabbitmq" }
);
