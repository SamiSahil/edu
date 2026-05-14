import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (value == null || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback = undefined) {
  const value = process.env[name];
  if (value == null || String(value).trim() === '') return fallback;
  return value;
}

function toInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback = false) {
  if (value == null) return fallback;
  const v = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(v)) return true;
  if (['false', '0', 'no', 'n'].includes(v)) return false;
  return fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: toInt(optional('PORT', '5000'), 5000),

  FRONTEND_ORIGIN: required('FRONTEND_ORIGIN'),

  DATABASE_URL: required('DATABASE_URL'),

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  ACCESS_TOKEN_TTL_SECONDS: toInt(optional('ACCESS_TOKEN_TTL_SECONDS', '900'), 900),

  REFRESH_TOKEN_TTL_DAYS: toInt(optional('REFRESH_TOKEN_TTL_DAYS', '30'), 30),
  COOKIE_SECURE: toBool(optional('COOKIE_SECURE', 'false'), false),
  COOKIE_SAMESITE: optional('COOKIE_SAMESITE', 'lax'),

  REDIS_URL: optional('REDIS_URL', ''),

  SENDGRID_API_KEY: optional('SENDGRID_API_KEY', ''),
  SENDGRID_FROM_EMAIL: optional('SENDGRID_FROM_EMAIL', ''),
  SENDGRID_FROM_NAME: optional('SENDGRID_FROM_NAME', 'Summit School OS'),

  TWILIO_ACCOUNT_SID: optional('TWILIO_ACCOUNT_SID', ''),
  TWILIO_AUTH_TOKEN: optional('TWILIO_AUTH_TOKEN', ''),
  TWILIO_FROM_NUMBER: optional('TWILIO_FROM_NUMBER', ''),

  CLOUDINARY_CLOUD_NAME: optional('CLOUDINARY_CLOUD_NAME', ''),
  CLOUDINARY_API_KEY: optional('CLOUDINARY_API_KEY', ''),
  CLOUDINARY_API_SECRET: optional('CLOUDINARY_API_SECRET', ''),
  CLOUDINARY_UPLOAD_FOLDER: optional('CLOUDINARY_UPLOAD_FOLDER', 'summit-school-os'),
};