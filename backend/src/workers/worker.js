import { Worker } from 'bullmq';
import { getRedis } from '../infra/redis/connection.js';
import { env } from '../config/env.js';
import { sendEmail } from '../infra/email/email.service.js';
import { sendSms } from '../infra/sms/sms.service.js';

const redis = getRedis();
if (!redis) {
  // eslint-disable-next-line no-console
  console.error('REDIS_URL is not configured. Worker cannot start.');
  process.exit(1);
}

function baseWorkerOptions() {
  return { connection: redis, concurrency: 10 };
}

new Worker(
  'email',
  async (job) => {
    if (job.name !== 'send') return { skipped: true };
    const { to, subject, html, text } = job.data || {};
    await sendEmail({ to, subject, html, text });
    return { ok: true };
  },
  baseWorkerOptions()
);

new Worker(
  'sms',
  async (job) => {
    if (job.name !== 'send') return { skipped: true };
    const { to, body } = job.data || {};
    await sendSms({ to, body });
    return { ok: true };
  },
  baseWorkerOptions()
);

// eslint-disable-next-line no-console
console.log(`Worker started (${env.NODE_ENV}).`);