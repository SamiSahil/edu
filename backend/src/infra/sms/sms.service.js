import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { getTwilio } from './twilio.client.js';

export async function sendSms({ to, body }) {
  const client = getTwilio();
  if (!client) {
    throw new AppError('Twilio is not configured.', 500, 'TWILIO_NOT_CONFIGURED');
  }
  if (!env.TWILIO_FROM_NUMBER) {
    throw new AppError('TWILIO_FROM_NUMBER is missing.', 500, 'TWILIO_FROM_MISSING');
  }

  const message = await client.messages.create({
    to,
    from: env.TWILIO_FROM_NUMBER,
    body,
  });

  return { success: true, sid: message.sid };
}