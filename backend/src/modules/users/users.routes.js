import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import {
  adminCreateUserSchema,
  changePasswordSchema,
  linkStudentSchema,
  updateMeSchema,
} from './users.schemas.js';

import {
  getMe,
  getSchoolUsers,
  patchMe,
  postChangePassword,
  postCreateUser,
  postLinkStudent,
  postUnlinkStudent,
} from './users.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.body = parsed.data;
    next();
  };
}

// Public session user endpoints
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, validateBody(updateMeSchema), patchMe);
router.post('/me/change-password', requireAuth, validateBody(changePasswordSchema), postChangePassword);

// Admin-only user management within a school
router.get('/', requireAuth, requireSchoolContext, requirePermission('settings'), requireRole(['Admin']), getSchoolUsers);

router.post(
  '/',
  requireAuth,
  requireSchoolContext,
  requirePermission('settings'),
  requireRole(['Admin']),
  validateBody(adminCreateUserSchema),
  postCreateUser
);

router.post(
  '/:id/link-student',
  requireAuth,
  requireSchoolContext,
  requirePermission('students'),
  requireRole(['Admin']),
  validateBody(linkStudentSchema),
  postLinkStudent
);

router.post(
  '/:id/unlink-student',
  requireAuth,
  requireSchoolContext,
  requirePermission('students'),
  requireRole(['Admin']),
  validateBody(linkStudentSchema.pick({ studentId: true })),
  postUnlinkStudent
);

export default router;