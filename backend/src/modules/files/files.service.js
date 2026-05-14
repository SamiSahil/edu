import { env } from '../../config/env.js';
import { prisma } from '../../infra/prisma/client.js';
import { createUploadSignature } from '../../infra/cloudinary/cloudinary.service.js';

export async function createSignedUpload({ schoolId, userId, resourceType, entityType, entityId, tags }) {
  const folderParts = [env.CLOUDINARY_UPLOAD_FOLDER, schoolId];

  if (entityType) folderParts.push(String(entityType));
  if (entityId) folderParts.push(String(entityId));

  const folder = folderParts.join('/');

  const signature = createUploadSignature({
    folder,
    resourceType: resourceType || 'auto',
    tags: tags || [],
  });

  return signature;
}

export async function confirmUpload({ schoolId, userId, payload }) {
  const file = await prisma.file.create({
    data: {
      schoolId,
      uploadedByUserId: userId || null,
      cloudinaryPublicId: payload.cloudinaryPublicId,
      secureUrl: payload.secureUrl,
      resourceType: payload.resourceType,
      format: payload.format || null,
      bytes: payload.bytes ?? null,
      originalFilename: payload.originalFilename || null,
      entityType: payload.entityType || null,
      entityId: payload.entityId || null,
    },
  });

  return file;
}