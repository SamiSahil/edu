import twilio from 'twilio';
import { env } from '../../config/env.js';

let client = null;

export function getTwilio() {
  if (client) return client;
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return null;
  client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return client;
}