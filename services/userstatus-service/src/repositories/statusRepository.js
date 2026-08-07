const { getClient } = require('../redis/client');

// Convention de cles Redis "sm:{domaine}:{objet}:{id}" (cf. docs/ARCHITECTURE.md).
const CURRENT_KEY_PREFIX = 'sm:userstatus:current:';
const HISTORY_KEY_PREFIX = 'sm:userstatus:history:';
const HISTORY_MAX_ENTRIES = 100;

async function publishStatus(userId, statusType, message) {
  const redis = getClient();
  const entry = { userId, statusType, message: message || null, updatedAt: new Date().toISOString() };
  const serialized = JSON.stringify(entry);

  await redis.set(CURRENT_KEY_PREFIX + userId, serialized);
  await redis.lpush(HISTORY_KEY_PREFIX + userId, serialized);
  await redis.ltrim(HISTORY_KEY_PREFIX + userId, 0, HISTORY_MAX_ENTRIES - 1);

  return entry;
}

async function getCurrentStatus(userId) {
  const redis = getClient();
  const value = await redis.get(CURRENT_KEY_PREFIX + userId);
  return value ? JSON.parse(value) : null;
}

async function getHistory(userId, limit = 50) {
  const redis = getClient();
  const values = await redis.lrange(HISTORY_KEY_PREFIX + userId, 0, limit - 1);
  return values.map((value) => JSON.parse(value));
}

module.exports = { publishStatus, getCurrentStatus, getHistory };
