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

const LOCK_TTL_MS = 5000;

// Verrou distribue anti-doublon check-in (cf. docs/ARCHITECTURE.md, convention de cles Redis
// "sm:{domaine}:{objet}:{id}" - exemple donne : "sm:presence:lock:{studentId}").
async function acquireLock(personId) {
  const redis = getClient();
  const result = await redis.set(`sm:presence:lock:${personId}`, '1', 'PX', LOCK_TTL_MS, 'NX');
  return result === 'OK';
}

async function releaseLock(personId) {
  const redis = getClient();
  await redis.del(`sm:presence:lock:${personId}`);
}

module.exports = { acquireLock, releaseLock };
