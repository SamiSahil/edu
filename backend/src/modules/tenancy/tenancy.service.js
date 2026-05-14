import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { signAccessToken } from '../auth/auth.service.js';

export async function listMySchools(userId) {
  const memberships = await prisma.schoolMembership.findMany({
    where: { userId },
    include: { school: true },
    orderBy: { createdAt: 'asc' },
  });

  return memberships.map((m) => ({
    schoolId: m.schoolId,
    schoolName: m.school.name,
    role: m.role,
  }));
}

export async function selectSchool({ userId, schoolId }) {
  const membership = await prisma.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId } },
    include: { school: true },
  });

  if (!membership) throw new AppError('You do not have access to this school.', 403, 'FORBIDDEN');

  const accessToken = signAccessToken({ userId, activeSchoolId: schoolId });

  return {
    accessToken,
    activeSchool: { id: membership.schoolId, name: membership.school.name, role: membership.role },
  };
}