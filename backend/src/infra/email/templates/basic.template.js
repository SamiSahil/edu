import { env } from '../../../config/env.js';

export function basicTemplate({ title, body, footer }) {
  const safeTitle = title || 'Summit School OS';
  const safeBody = body || '';
  const safeFooter = footer || `© ${new Date().getFullYear()} ${env.SENDGRID_FROM_NAME}`;

  return `
  <div style="font-family: Inter, Arial, sans-serif; background:#0a0a0b; color:#f4f4f5; padding:24px;">
    <div style="max-width:640px; margin:0 auto; background:#111113; border:1px solid #27272a; border-radius:18px; overflow:hidden;">
      <div style="padding:20px 22px; border-bottom:1px solid #27272a;">
        <div style="font-size:12px; letter-spacing:0.16em; text-transform:uppercase; color:#71717a;">Summit School OS</div>
        <div style="font-size:22px; margin-top:10px; font-weight:700;">${safeTitle}</div>
      </div>
      <div style="padding:22px; color:#d4d4d8; line-height:1.6; font-size:14px;">
        ${safeBody}
      </div>
      <div style="padding:16px 22px; border-top:1px solid #27272a; color:#71717a; font-size:12px;">
        ${safeFooter}
      </div>
    </div>
  </div>`;
}