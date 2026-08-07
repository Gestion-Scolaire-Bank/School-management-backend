const Redis = require('ioredis');

let client;

function getClient() {
  if (!client) {
    client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
    });
  }
  return client;
}

module.exports = { getClient };
