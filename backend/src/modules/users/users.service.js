import argon2 from 'argon2';
import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { normalizeEmail, normalizeUsername, trim, lower } from '../../shared/utils/ids.js';
import { writeAuditLog } from '../audit/audit.service.js';

export async function getMeUser({ userId, activeSchoolId }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, username: true, createdAt: true },
  });
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');

  let membership = null;
  if (activeSchoolId) {
    membership = await prisma.schoolMembership.findUnique({
      where: { schoolId_userId: { schoolId: activeSchoolId, userId } },
      include: { school: true },
    });
  }

  return {
    user,
    activeSchool: membership
      ? { id: membership.schoolId, name: membership.school.name, role: membership.role }
      : null,
  };
}

export async function updateMeUser({ userId, payload }) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new AppError('User not found.', 404, 'NOT_FOUND');

  const updates = {};

  if (payload.name != null) updates.name = trim(payload.name);

  if (payload.email != null) {
    const emailLower = normalizeEmail(payload.email);
    const dup = await prisma.user.findUnique({ where: { emailLower } });
    if (dup && dup.id !== userId) throw new AppError('Email already exists.', 409, 'CONFLICT', { field: 'email' });

    updates.email = trim(payload.email);
    updates.emailLower = emailLower;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: { id: true, name: true, email: true, username: true, createdAt: true },
  });

  return updated;
}

export async function changePassword({ userId, currentPassword, nextPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');

  const ok = await argon2.verify(user.passwordHash, currentPassword);
  if (!ok) throw new AppError('Current password is incorrect.', 400, 'VALIDATION_ERROR');

  const passwordHash = await argon2.hash(nextPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
}

/**
 * Admin creates a global user and adds membership in the current school.
 * Email/username must be unique globally (enforced by emailLower/usernameLower unique).
 */
export async function adminCreateUser({ schoolId, adminUserId, payload }) {
  const emailLower = normalizeEmail(payload.email);
  const usernameLower = normalizeUsername(payload.username);

  const [emailDup, userDup] = await Promise.all([
    prisma.user.findUnique({ where: { emailLower } }),
    prisma.user.findUnique({ where: { usernameLower } }),
  ]);

  if (emailDup) throw new AppError('Email already exists.', 409, 'CONFLICT', { field: 'email' });
  if (userDup) throw new AppError('Username already exists.', 409, 'CONFLICT', { field: 'username' });

  const passwordHash = await argon2.hash(payload.password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: trim(payload.name),
        email: trim(payload.email),
        emailLower,
        username: trim(payload.username),
        usernameLower,
        passwordHash,
      },
    });

    await tx.schoolMembership.create({
      data: {
        schoolId,
        userId: user.id,
        role: payload.role,
      },
    });

    return user;
  });

  await writeAuditLog({
    schoolId,
    userId: adminUserId,
    entityType: 'user',
    entityId: result.id,
    action: 'created',
    message: `User created: ${result.email} (${payload.role})`,
  });

  return result;
}

export async function listSchoolUsers({ schoolId }) {
  const memberships = await prisma.schoolMembership.findMany({
    where: { schoolId },
    include: { user: { select: { id: true, name: true, email: true, username: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return memberships.map((m) => ({
    membershipId: m.id,
    role: m.role,
    user: m.user,
    schoolId: m.schoolId,
  }));
}

export async function linkUserToStudent({ schoolId, adminUserId, userId, studentId, role }) {
  // ensure membership exists
  const membership = await prisma.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId } },
  });
  if (!membership) throw new AppError('User is not a member of this school.', 400, 'VALIDATION_ERROR');

  const student = await prisma.student.findFirst({
    where: { schoolId, id: studentId, isArchived: false },
    select: { id: true, fullName: true },
  });
  if (!student) throw new AppError('Student not found.', 400, 'VALIDATION_ERROR');

  const link = await prisma.studentLink.upsert({
    where: {
      schoolId_userId_studentId: { schoolId, userId, studentId },
    },
    create: { schoolId, userId, studentId, role },
    update: { role },
  });

  await writeAuditLog({
    schoolId,
    userId: adminUserId,
    entityType: 'studentLink',
    entityId: link.id,
    action: 'linked',
    message: `Linked user ${userId} to student ${student.fullName} as ${role}`,
  });

  return link;
}

export async function unlinkUserFromStudent({ schoolId, adminUserId, userId, studentId }) {
  const existing = await prisma.studentLink.findUnique({
    where: { schoolId_userId_studentId: { schoolId, userId, studentId } },
  });
  if (!existing) return { success: true };

  await prisma.studentLink.delete({
    where: { schoolId_userId_studentId: { schoolId, userId, studentId } },
  });

  await writeAuditLog({
    schoolId,
    userId: adminUserId,
    entityType: 'studentLink',
    entityId: existing.id,
    action: 'unlinked',
    message: `Unlinked user ${userId} from student ${studentId}`,
  });

  return { success: true };
}