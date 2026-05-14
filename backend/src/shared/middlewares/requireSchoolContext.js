import { AppError } from '../errors/AppError.js';
import { prisma } from '../../infra/prisma/client.js';

export async function requireSchoolContext(req, res, next) {
  const schoolId =
    req.auth?.activeSchoolId ||
    (req.header('x-school-id') ? String(req.header('x-school-id')).trim() : '');

  if (!schoolId) {
    throw new AppError(
      'No active school selected. Call tenancy/select-school first.',
      400,
      'SCHOOL_NOT_SELECTED'
    );
  }

  const membership = await prisma.schoolMembership.findUnique({
    where: {
      schoolId_userId: {
        schoolId,
        userId: req.auth.userId,
      },
    },
    include: {
      school: true,
    },
  });

  if (!membership) {
    throw new AppError('You do not have access to this school.', 403, 'FORBIDDEN');
  }

  req.school = {
    id: membership.schoolId,
    role: membership.role,
    membershipId: membership.id,
    record: membership.school,
  };

  next();
}