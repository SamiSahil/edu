import { env } from '../../config/env.js';
import { getSendgrid, ensureSendgrid } from './sendgrid.client.js';
import { AppError } from '../../shared/errors/AppError.js';

export async function sendEmail({ to, subject, html, text }) {
  const ok = ensureSendgrid();
  if (!ok) {
    throw new AppError('SendGrid is not configured.', 500, 'SENDGRID_NOT_CONFIGURED');
  }
  if (!env.SENDGRID_FROM_EMAIL) {
    throw new AppError('SENDGRID_FROM_EMAIL is missing.', 500, 'SENDGRID_FROM_MISSING');
  }

  const msg = {
    to,
    from: {
      email: env.SENDGRID_FROM_EMAIL,
      name: env.SENDGRID_FROM_NAME || 'Summit School OS',
    },
    subject,
    text: text || undefined,
    html: html || undefined,
  };

  const client = getSendgrid();
  await client.send(msg);
  return { success: true };
}