import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';

import { prisma } from '../../infra/prisma/client.js';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { normalizeEmail, normalizeUsername, lower, trim } from '../../shared/utils/ids.js';

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function signAccessToken({ userId, activeSchoolId = null }) {
  return jwt.sign(
    { userId, activeSchoolId },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL_SECONDS }
  );
}

export async function createRefreshToken({ userId, userAgent, ip }) {
  const raw = randomBytes(48).toString('base64url');
  const tokenHash = hashToken(raw);

  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: userAgent || null,
      ip: ip || null,
    },
  });

  return { raw, expiresAt };
}

export async function rotateRefreshToken({ rawToken, userAgent, ip }) {
  const tokenHash = hashToken(rawToken);

  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing) throw new AppError('Invalid refresh token.', 401, 'UNAUTHORIZED');
  if (existing.revokedAt) throw new AppError('Refresh token revoked.', 401, 'UNAUTHORIZED');
  if (existing.expiresAt.getTime() < Date.now()) throw new AppError('Refresh token expired.', 401, 'UNAUTHORIZED');

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const next = await createRefreshToken({
    userId: existing.userId,
    userAgent,
    ip,
  });

  return { userId: existing.userId, ...next };
}

export async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing) return;
  if (existing.revokedAt) return;

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });
}

export async function registerAndCreateSchool({ name, email, username, password, schoolName }) {
  const emailLower = normalizeEmail(email);
  const usernameLower = normalizeUsername(username);

  const emailExists = await prisma.user.findUnique({ where: { emailLower } });
  if (emailExists) throw new AppError('Email already exists.', 409, 'CONFLICT', { field: 'email' });

  const usernameExists = await prisma.user.findUnique({ where: { usernameLower } });
  if (usernameExists) throw new AppError('Username already exists.', 409, 'CONFLICT', { field: 'username' });

  const passwordHash = await argon2.hash(password);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: trim(name),
        email: trim(email),
        emailLower,
        username: trim(username),
        usernameLower,
        passwordHash,
      },
    });

    const school = await tx.school.create({
      data: {
        name: trim(schoolName),
      },
    });

    const membership = await tx.schoolMembership.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        role: 'Admin',
      },
    });

    return { user, school, membership };
  });

  return created;
}

export async function loginWithIdentity({ identity, password }) {
  const ident = lower(identity);

  const user = await prisma.user.findFirst({
    where: {
      isActive: true,
      OR: [{ emailLower: ident }, { usernameLower: ident }],
    },
  });

  if (!user) throw new AppError('Invalid credentials.', 401, 'UNAUTHORIZED');

  const ok = await argon2.verify(user.passwordHash, password);
  if (!ok) throw new AppError('Invalid credentials.', 401, 'UNAUTHORIZED');

  // pick a default school if user has memberships (frontend has no school selector yet)
  const memberships = await prisma.schoolMembership.findMany({
    where: { userId: user.id },
    include: { school: true },
    orderBy: { createdAt: 'asc' },
  });

  const active = memberships[0] || null;

  const accessToken = signAccessToken({
    userId: user.id,
    activeSchoolId: active?.schoolId || null,
  });

  return {
    user,
    activeSchool: active ? { id: active.schoolId, name: active.school.name, role: active.role } : null,
    memberships: memberships.map((m) => ({ schoolId: m.schoolId, schoolName: m.school.name, role: m.role })),
    accessToken,
  };
}

export async function getMe({ userId, activeSchoolId }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, username: true, createdAt: true },
  });

  if (!user) throw new AppError('Session user not found.', 401, 'UNAUTHORIZED');

  let activeSchool = null;
  let linkedStudentIds = [];

  if (activeSchoolId) {
    const membership = await prisma.schoolMembership.findUnique({
      where: { schoolId_userId: { schoolId: activeSchoolId, userId } },
      include: { school: true },
    });

    if (membership) {
      activeSchool = {
        id: membership.schoolId,
        name: membership.school.name,
        role: membership.role,
      };

      const links = await prisma.studentLink.findMany({
        where: { schoolId: activeSchoolId, userId },
        select: { studentId: true },
      });
      linkedStudentIds = links.map((l) => l.studentId);
    }
  }

  return { user, activeSchool, linkedStudentIds };
}