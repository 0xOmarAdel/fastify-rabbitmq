# Fastify RabbitMQ Multi‑Server Project

This project demonstrates a simple distributed messaging setup using Fastify and RabbitMQ. It consists of three separate servers:

- **Producer (Port 3000):** Publishes fake user and country data to a RabbitMQ exchange.
- **Consumer‑1 (Port 3001):** Consumes only user messages.
- **Consumer‑2 (Port 3002):** Consumes both user and country messages.

All servers use the following environment variables:

```env
RABBITMQ_CONNECTION=amqp://guest:guest@localhost
RABBITMQ_EXCHANGE=ex.producer
```

## Producer Server (Port 3000)

The producer server exposes a POST route (`/rabbitmq`) that generates fake data using [@faker-js/faker](https://www.npmjs.com/package/@faker-js/faker) and publishes two messages—one for a user and one for a country—to the exchange with the routing keys `"users"` and `"countries"` respectively.

**Example code (producer):**

```js
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

    await Promise.all([
      fastify.rabbitmqPublisher.send(
        { exchange: process.env.RABBITMQ_EXCHANGE, routingKey: "users" },
        fakeUser
      ),
      fastify.rabbitmqPublisher.send(
        { exchange: process.env.RABBITMQ_EXCHANGE, routingKey: "countries" },
        fakeCountry
      ),
    ]);

    reply.send({ user: fakeUser, country: fakeCountry });
  });
};
```

## Consumer‑1 Server (Port 3001)

Consumer‑1 registers a consumer on the queue `q.consumer-1` with a binding for the `"users"` routing key, so it only receives user messages.

**Example code (consumer‑1):**

```js
const fp = require("fastify-plugin");
const rabbitMQPlugin = require("fastify-rabbitmq");

module.exports = fp(
  async function (fastify) {
    fastify.register(rabbitMQPlugin, {
      connection: process.env.RABBITMQ_CONNECTION,
    });

    fastify.ready().then(async () => {
      fastify.rabbitmq.createConsumer(
        {
          queue: "q.consumer-1",
          queueOptions: { durable: true },
          queueBindings: [
            { exchange: process.env.RABBITMQ_EXCHANGE, routingKey: "users" },
          ],
        },
        async (msg) => {
          console.log("Consumer-1 received message:", msg);
        }
      );
    });
  },
  { name: "rabbitmq" }
);
```

## Consumer‑2 Server (Port 3002)

Consumer‑2 registers a consumer on the queue `q.consumer-2` with bindings for both `"users"` and `"countries"` routing keys, so it receives messages for both.

**Example code (consumer‑2):**

```js
const fp = require("fastify-plugin");
const rabbitMQPlugin = require("fastify-rabbitmq");

module.exports = fp(
  async function (fastify) {
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
          console.log("Consumer-2 received message:", msg);
        }
      );
    });
  },
  { name: "rabbitmq" }
);
```

## Running the Project

1. **Configure Environment Variables:**

   In each server directory (`producer`, `consumer-1`, and `consumer-2`), create a `.env` file with:

   ```env
   RABBITMQ_CONNECTION=amqp://guest:guest@localhost
   RABBITMQ_EXCHANGE=ex.producer
   ```

2. **Install Dependencies:**

   Run your package manager (e.g. `npm install` or `pnpm install`) in each directory.

3. **Start the Servers:**

   - Start the producer server on port 3000.
   - Start consumer‑1 on port 3001.
   - Start consumer‑2 on port 3002.

4. **Test the Setup:**

   Send a POST request to `http://localhost:3000/rabbitmq`.  
   The producer will publish fake user and country messages, consumer‑1 will log only user messages, and consumer‑2 will log both.

## Summary

This project shows how to build a simple distributed system with Fastify and RabbitMQ:

- The **producer** generates fake data and publishes messages.
- **Consumer‑1** listens for user messages.
- **Consumer‑2** listens for both user and country messages.

Feel free to extend this example or modify it to suit your needs!
