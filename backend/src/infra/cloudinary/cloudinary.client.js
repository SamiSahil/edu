import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env.js';

let configured = false;

export function ensureCloudinary() {
  if (configured) return true;
  const ok = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  if (!ok) return false;

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  configured = true;
  return true;
}

export function getCloudinary() {
  ensureCloudinary();
  return cloudinary;
}