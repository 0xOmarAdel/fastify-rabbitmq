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

    const realPublisher = fastify.rabbitmq.createPublisher({
      confirm: true,
      maxAttempts: 1,
      exchanges: [
        {
          exchange: process.env.RABBITMQ_EXCHANGE,
          type: "topic",
          durable: true,
          passive: true,
          autoDelete: false,
        },
      ],
      onReturn: (msg) => {
        fastify.log.error(`Message returned: ${JSON.stringify(msg, null, 2)}`);
      },
    });

    const publisher = {
      send: async (...args) => {
        if (!connectionEstablished) {
          fastify.log.warn(
            `RabbitMQ is not available, ${JSON.stringify(args, null, 2)}`
          );
          return Promise.resolve();
        }
        return (
          realPublisher
            // @ts-ignore
            .send(...args)
            .then(() =>
              fastify.log.info(
                `Message sent to RabbitMQ: ${JSON.stringify(args, null, 2)}`
              )
            )
            .catch((err) => {
              fastify.log.error(
                `RabbitMQ send error: ${JSON.stringify(
                  err,
                  null,
                  2
                )}, ${JSON.stringify(args, null, 2)}`
              );
            })
        );
      },
    };

    fastify.decorate("rabbitmqPublisher", publisher);

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
