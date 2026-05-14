import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { parsePagination, buildPageMeta } from '../../shared/utils/pagination.js';
import { trim } from '../../shared/utils/ids.js';
import { writeAuditLog } from '../audit/audit.service.js';

export async function listGuardians({ schoolId, query }) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const search = trim(query.search || '');

  const where = {
    schoolId,
    isArchived: false,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
      { relation: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [totalItems, items] = await Promise.all([
    prisma.guardian.count({ where }),
    prisma.guardian.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return { items, meta: buildPageMeta({ page, pageSize, totalItems }) };
}

export async function getGuardianById({ schoolId, id }) {
  const guardian = await prisma.guardian.findFirst({ where: { schoolId, id } });
  if (!guardian) throw new AppError('Guardian not found.', 404, 'NOT_FOUND');
  return guardian;
}

export async function createGuardian({ schoolId, userId, payload }) {
  const guardian = await prisma.guardian.create({
    data: {
      schoolId,
      name: trim(payload.name),
      phone: trim(payload.phone),
      email: payload.email ? trim(payload.email) : null,
      relation: payload.relation ? trim(payload.relation) : null,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'guardian',
    entityId: guardian.id,
    action: 'created',
    message: `Guardian created: ${guardian.name}`,
  });

  return guardian;
}

export async function updateGuardian({ schoolId, userId, id, payload }) {
  const existing = await prisma.guardian.findFirst({ where: { schoolId, id } });
  if (!existing) throw new AppError('Guardian not found.', 404, 'NOT_FOUND');

  const updated = await prisma.guardian.update({
    where: { id },
    data: {
      name: payload.name != null ? trim(payload.name) : undefined,
      phone: payload.phone != null ? trim(payload.phone) : undefined,
      email: payload.email != null ? (payload.email ? trim(payload.email) : null) : undefined,
      relation: payload.relation != null ? (payload.relation ? trim(payload.relation) : null) : undefined,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'guardian',
    entityId: updated.id,
    action: 'updated',
    message: `Guardian updated: ${updated.name}`,
  });

  return updated;
}

export async function archiveGuardian({ schoolId, userId, id }) {
  const existing = await prisma.guardian.findFirst({ where: { schoolId, id } });
  if (!existing) throw new AppError('Guardian not found.', 404, 'NOT_FOUND');

  const updated = await prisma.guardian.update({
    where: { id },
    data: { isArchived: true },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'guardian',
    entityId: id,
    action: 'archived',
    message: `Guardian archived: ${existing.name}`,
  });

  return updated;
}