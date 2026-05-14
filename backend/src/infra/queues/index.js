import { Queue } from 'bullmq';
import { getRedis } from '../redis/connection.js';

let emailQueue = null;
let smsQueue = null;

function getConnectionOrThrow() {
  const redis = getRedis();
  if (!redis) {
    throw new Error('REDIS_URL is not configured. Queues are disabled.');
  }
  // BullMQ accepts ioredis connection options OR a connection instance under `connection`.
  return { connection: redis };
}

export function getEmailQueue() {
  if (emailQueue) return emailQueue;
  const opts = getConnectionOrThrow();
  emailQueue = new Queue('email', opts);
  return emailQueue;
}

export function getSmsQueue() {
  if (smsQueue) return smsQueue;
  const opts = getConnectionOrThrow();
  smsQueue = new Queue('sms', opts);
  return smsQueue;
}