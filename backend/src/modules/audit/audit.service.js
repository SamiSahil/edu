import { prisma } from '../../infra/prisma/client.js';

export async function writeAuditLog({
  schoolId,
  userId = null,
  entityType,
  entityId,
  action,
  message,
}) {
  if (!schoolId || !entityType || !entityId || !action) return;

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId,
      entityType,
      entityId,
      action,
      message: message || `${entityType}:${action}`,
    },
  });
}