import Redis from 'ioredis';
import { env } from '../../config/env.js';

let client = null;

export function getRedis() {
  if (client) return client;
  if (!env.REDIS_URL) return null;

  client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  client.on('error', (err) => {
    // Keep process alive; queues/workers can decide whether to exit.
    // eslint-disable-next-line no-console
    console.error('Redis error:', err?.message || err);
  });

  return client;
}