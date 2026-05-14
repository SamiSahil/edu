import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { trim } from '../../shared/utils/ids.js';
import { writeAuditLog } from '../audit/audit.service.js';

export async function getCurrentSchool({ schoolId }) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new AppError('School not found.', 404, 'NOT_FOUND');
  return school;
}

export async function updateCurrentSchool({ schoolId, userId, payload }) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new AppError('School not found.', 404, 'NOT_FOUND');

  const updated = await prisma.school.update({
    where: { id: schoolId },
    data: {
      name: payload.name != null ? trim(payload.name) : undefined,
      logoUrl: payload.logoUrl != null ? (payload.logoUrl ? trim(payload.logoUrl) : null) : undefined,
      email: payload.email != null ? (payload.email ? trim(payload.email) : null) : undefined,
      phone: payload.phone != null ? (payload.phone ? trim(payload.phone) : null) : undefined,
      address: payload.address != null ? (payload.address ? String(payload.address) : null) : undefined,
      motto: payload.motto != null ? (payload.motto ? trim(payload.motto) : null) : undefined,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'school',
    entityId: schoolId,
    action: 'updated',
    message: `School profile updated: ${updated.name}`,
  });

  return updated;
}