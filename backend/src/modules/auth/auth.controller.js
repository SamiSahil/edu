import { created, ok } from '../../shared/http/response.js';
import { AppError } from '../../shared/errors/AppError.js';
import { clearRefreshCookieOptions, refreshCookieOptions } from '../../config/security.js';
import { env } from '../../config/env.js';
import { basicTemplate } from '../../infra/email/templates/basic.template.js';
import { enqueueEmail } from '../../infra/queues/email.queue.js';
import { prisma } from '../../infra/prisma/client.js';

import {
  createRefreshToken,
  getMe,
  loginWithIdentity,
  registerAndCreateSchool,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from './auth.service.js';

async function pickActiveSchoolId(userId, preferredSchoolId = null) {
  if (preferredSchoolId) {
    const membership = await prisma.schoolMembership.findUnique({
      where: { schoolId_userId: { schoolId: preferredSchoolId, userId } },
      select: { schoolId: true },
    });
    if (membership) return membership.schoolId;
  }

  const first = await prisma.schoolMembership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { schoolId: true },
  });

  return first?.schoolId || null;
}

export async function register(req, res) {
  const { name, email, username, password, schoolName } = req.body;

  const { user, school } = await registerAndCreateSchool({ name, email, username, password, schoolName });

  const accessToken = signAccessToken({ userId: user.id, activeSchoolId: school.id });
  const refresh = await createRefreshToken({
    userId: user.id,
    userAgent: req.header('user-agent'),
    ip: req.ip,
  });

  res.cookie('sms_refresh', refresh.raw, {
    ...refreshCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });

  return created(res, {
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, username: user.username },
    activeSchool: { id: school.id, name: school.name, role: 'Admin' },
  });
}

export async function login(req, res) {
  const { identity, password } = req.body;
  const result = await loginWithIdentity({ identity, password });

  const refresh = await createRefreshToken({
    userId: result.user.id,
    userAgent: req.header('user-agent'),
    ip: req.ip,
  });

  res.cookie('sms_refresh', refresh.raw, {
    ...refreshCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });

  return ok(res, {
    accessToken: result.accessToken,
    user: { id: result.user.id, name: result.user.name, email: result.user.email, username: result.user.username },
    activeSchool: result.activeSchool,
    memberships: result.memberships,
  });
}

export async function refresh(req, res) {
  const raw = req.cookies?.sms_refresh;
  if (!raw) throw new AppError('Refresh token missing.', 401, 'UNAUTHORIZED');

  const rotated = await rotateRefreshToken({
    rawToken: raw,
    userAgent: req.header('user-agent'),
    ip: req.ip,
  });

  // Choose active school from optional header
  const preferredSchoolId = req.header('x-school-id') ? String(req.header('x-school-id')).trim() : null;
  const activeSchoolId = await pickActiveSchoolId(rotated.userId, preferredSchoolId);

  const accessToken = signAccessToken({ userId: rotated.userId, activeSchoolId });

  res.cookie('sms_refresh', rotated.raw, {
    ...refreshCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });

  return ok(res, { accessToken, activeSchoolId });
}

export async function logout(req, res) {
  const raw = req.cookies?.sms_refresh;
  await revokeRefreshToken(raw);

  res.clearCookie('sms_refresh', clearRefreshCookieOptions());
  return ok(res, { success: true });
}

export async function me(req, res) {
  const { userId, activeSchoolId } = req.auth;
  const data = await getMe({ userId, activeSchoolId });
  return ok(res, data);
}

export async function forgotPassword(req, res) {
  const identity = String(req.body.identity || '').trim().toLowerCase();
  if (!identity) throw new AppError('Identity is required.', 400, 'VALIDATION_ERROR');

  await enqueueEmail('send', {
    to: identity,
    subject: 'Password reset request',
    html: basicTemplate({
      title: 'Password reset request',
      body: `
        <p>We received a password reset request for this account.</p>
        <p>If this was you, please contact your school administrator to reset access (reset flow UI not enabled yet).</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    }),
    text: 'Password reset request received. Contact your school administrator to reset access.',
  }).catch(() => {});

  return ok(res, { message: 'If the account exists, a reset email has been sent.' });
}

/**
 * DEV ONLY: provides demo credentials similar to your frontend demo buttons.
 * This should be disabled in production.
 */
export async function demoCredentials(req, res) {
  if (env.NODE_ENV === 'development') {
    throw new AppError('Not available in production.', 404, 'NOT_FOUND');
  }

  // Find one user per role from memberships (across all schools) for convenience.
  const memberships = await prisma.schoolMembership.findMany({
    include: { user: true, school: true },
    orderBy: { createdAt: 'asc' },
  });

  const seen = new Set();
  const unique = [];

  for (const m of memberships) {
    const role = m.role;
    if (!role || seen.has(role)) continue;
    seen.add(role);
    unique.push({
      role,
      identity: m.user.username || m.user.email,
      password: 'password123',
      name: m.user.name,
      userId: m.user.id,
      schoolId: m.schoolId,
      schoolName: m.school.name,
    });
  }

  unique.sort((a, b) => String(a.role).localeCompare(String(b.role)));

  return ok(res, unique);
}