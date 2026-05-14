import { getEmailQueue } from './index.js';

export async function enqueueEmail(jobName, payload, opts = {}) {
  const queue = getEmailQueue();
  return queue.add(jobName, payload, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 2000,
    ...opts,
  });
}