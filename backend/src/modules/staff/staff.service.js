import argon2 from 'argon2';
import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { parsePagination, buildPageMeta } from '../../shared/utils/pagination.js';
import { trim, normalizeEmail, normalizeUsername } from '../../shared/utils/ids.js';
import { writeAuditLog } from '../audit/audit.service.js';

function emailLocalPart(email) {
  const e = String(email || '').trim();
  const at = e.indexOf('@');
  const base = at > 0 ? e.slice(0, at) : e;
  return base.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || 'user';
}

async function generateUniqueUsername(baseUsername) {
  const base = trim(baseUsername).toLowerCase().slice(0, 32) || 'user';
  const baseLower = normalizeUsername(base);

  const exists = await prisma.user.findUnique({ where: { usernameLower: baseLower } });
  if (!exists) return base;

  for (let i = 2; i < 9999; i += 1) {
    const candidate = `${base}-${i}`.slice(0, 40);
    // eslint-disable-next-line no-await-in-loop
    const dup = await prisma.user.findUnique({ where: { usernameLower: normalizeUsername(candidate) } });
    if (!dup) return candidate;
  }

  throw new AppError('Unable to generate a unique username.', 500, 'INTERNAL_ERROR');
}

async function assertEmailNotTaken(email, fieldName = 'email') {
  const emailLower = normalizeEmail(email);
  const dup = await prisma.user.findUnique({ where: { emailLower } });
  if (dup) throw new AppError('Email already exists.', 409, 'CONFLICT', { field: fieldName });
  return emailLower;
}

export async function listStaff({ schoolId, query }) {
  const { page, pageSize, skip, take } = parsePagination(query);

  const search = trim(query.search || '');
  const role = trim(query.role || 'all');
  const status = trim(query.status || 'all');

  const where = {
    schoolId,
    isArchived: false,
  };

  if (role !== 'all') where.roleLabel = role;
  if (status !== 'all') where.status = status;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { department: { contains: search, mode: 'insensitive' } },
      { roleLabel: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [totalItems, items] = await Promise.all([
    prisma.staff.count({ where }),
    prisma.staff.findMany({
      where,
      orderBy: { joinDate: 'desc' },
      skip,
      take,
      include: {
        user: { select: { id: true, email: true, username: true } },
      },
    }),
  ]);

  return { items, meta: buildPageMeta({ page, pageSize, totalItems }) };
}

export async function getStaffById({ schoolId, id }) {
  const staff = await prisma.staff.findFirst({
    where: { schoolId, id },
    include: {
      user: { select: { id: true, email: true, username: true, createdAt: true } },
    },
  });
  if (!staff) throw new AppError('Staff record not found.', 404, 'NOT_FOUND');
  return staff;
}

export async function createStaff({ schoolId, userId, payload }) {
  const dupEmail = await prisma.staff.findFirst({
    where: { schoolId, email: trim(payload.email), isArchived: false },
    select: { id: true },
  });
  if (dupEmail) throw new AppError('Staff email already exists.', 409, 'CONFLICT', { field: 'email' });

  const dupPhone = await prisma.staff.findFirst({
    where: { schoolId, phone: trim(payload.phone), isArchived: false },
    select: { id: true },
  });
  if (dupPhone) throw new AppError('Staff phone already exists.', 409, 'CONFLICT', { field: 'phone' });

  const createLogin = Boolean(payload.createLogin);
  const password = trim(payload.loginPassword || '');

  if (createLogin && password.length < 8) {
    throw new AppError('Password is required (min 8 chars) to create login.', 400, 'VALIDATION_ERROR', {
      field: 'loginPassword',
    });
  }

  const created = await prisma.$transaction(async (tx) => {
    let createdUser = null;

    if (createLogin) {
      const email = trim(payload.email);
      const emailLower = await assertEmailNotTaken(email, 'email');

      const username = await generateUniqueUsername(emailLocalPart(email));
      const usernameLower = normalizeUsername(username);

      const passwordHash = await argon2.hash(password);

      createdUser = await tx.user.create({
        data: {
          name: trim(payload.name),
          email,
          emailLower,
          username,
          usernameLower,
          passwordHash,
        },
      });

      await tx.schoolMembership.create({
        data: {
          schoolId,
          userId: createdUser.id,
          role: payload.roleLabel, // must match SchoolRole enum values
        },
      });
    }

    const staff = await tx.staff.create({
      data: {
        schoolId,
        name: trim(payload.name),
        roleLabel: payload.roleLabel,
        department: trim(payload.department),
        email: trim(payload.email),
        phone: trim(payload.phone),
        joinDate: new Date(payload.joinDate),
        status: payload.status || 'active',
        isArchived: false,
        userId: createdUser?.id || null,
      },
      include: {
        user: { select: { id: true, email: true, username: true } },
      },
    });

    return staff;
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'staff',
    entityId: created.id,
    action: 'created',
    message: `Staff created: ${created.name} (${created.roleLabel})`,
  });

  return created;
}

export async function updateStaff({ schoolId, userId, id, payload }) {
  const existing = await prisma.staff.findFirst({ where: { schoolId, id } });
  if (!existing) throw new AppError('Staff record not found.', 404, 'NOT_FOUND');

  if (payload.email) {
    const dupEmail = await prisma.staff.findFirst({
      where: { schoolId, email: trim(payload.email), isArchived: false, id: { not: id } },
      select: { id: true },
    });
    if (dupEmail) throw new AppError('Staff email already exists.', 409, 'CONFLICT', { field: 'email' });
  }

  if (payload.phone) {
    const dupPhone = await prisma.staff.findFirst({
      where: { schoolId, phone: trim(payload.phone), isArchived: false, id: { not: id } },
      select: { id: true },
    });
    if (dupPhone) throw new AppError('Staff phone already exists.', 409, 'CONFLICT', { field: 'phone' });
  }

  const updated = await prisma.staff.update({
    where: { id },
    data: {
      name: payload.name != null ? trim(payload.name) : undefined,
      roleLabel: payload.roleLabel != null ? payload.roleLabel : undefined,
      department: payload.department != null ? trim(payload.department) : undefined,
      email: payload.email != null ? trim(payload.email) : undefined,
      phone: payload.phone != null ? trim(payload.phone) : undefined,
      joinDate: payload.joinDate != null ? new Date(payload.joinDate) : undefined,
      status: payload.status != null ? payload.status : undefined,
    },
    include: {
      user: { select: { id: true, email: true, username: true } },
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'staff',
    entityId: updated.id,
    action: 'updated',
    message: `Staff updated: ${updated.name} (${updated.roleLabel})`,
  });

  return updated;
}

export async function archiveStaff({ schoolId, userId, id }) {
  const existing = await prisma.staff.findFirst({ where: { schoolId, id } });
  if (!existing) throw new AppError('Staff record not found.', 404, 'NOT_FOUND');

  const updated = await prisma.staff.update({
    where: { id },
    data: {
      isArchived: true,
      status: 'archived',
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'staff',
    entityId: id,
    action: 'archived',
    message: `Staff archived: ${existing.name} (${existing.roleLabel})`,
  });

  return updated;
}