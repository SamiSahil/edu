import { getSmsQueue } from './index.js';

export async function enqueueSms(jobName, payload, opts = {}) {
  const queue = getSmsQueue();
  return queue.add(jobName, payload, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 2000,
    ...opts,
  });
}