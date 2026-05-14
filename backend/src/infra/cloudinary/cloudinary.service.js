import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { getCloudinary, ensureCloudinary } from './cloudinary.client.js';

export function createUploadSignature({ folder, resourceType = 'auto', publicId, tags = [] }) {
  const ok = ensureCloudinary();
  if (!ok) throw new AppError('Cloudinary is not configured.', 500, 'CLOUDINARY_NOT_CONFIGURED');

  const cloudinary = getCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign = {
    timestamp,
    folder,
    resource_type: resourceType,
  };

  if (publicId) paramsToSign.public_id = publicId;
  if (tags?.length) paramsToSign.tags = Array.isArray(tags) ? tags.join(',') : String(tags);

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
    resourceType,
    publicId: publicId || null,
    tags: tags || [],
  };
}