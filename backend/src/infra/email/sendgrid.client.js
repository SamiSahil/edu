import sgMail from '@sendgrid/mail';
import { env } from '../../config/env.js';

let configured = false;

export function ensureSendgrid() {
  if (configured) return true;
  if (!env.SENDGRID_API_KEY) return false;
  sgMail.setApiKey(env.SENDGRID_API_KEY);
  configured = true;
  return true;
}

export function getSendgrid() {
  ensureSendgrid();
  return sgMail;
}
