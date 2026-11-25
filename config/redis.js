const { Redis } = require('ioredis');

// Reusable Redis connection configuration for BullMQ
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
};

function createRedisClient() {
  return new Redis(redisConnection);
}

module.exports = {
  redisConnection,
  createRedisClient,
};
