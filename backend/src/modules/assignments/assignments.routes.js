import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import {
  archiveAssignmentSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
} from './assignments.schemas.js';

import {
  getDetail,
  getList,
  patchUpdate,
  postArchive,
  postCreate,
} from './assignments.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.body = parsed.data;
    next();
  };
}

router.use(requireAuth, requireSchoolContext, requirePermission('assignments'));

// View list/detail: all roles with assignments permission (server will scope student/parent)
router.get('/', getList);
router.get('/:id', getDetail);

// Manage: Admin/Principal/Teacher (matches frontend)
router.post('/', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(createAssignmentSchema), postCreate);
router.patch('/:id', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(updateAssignmentSchema), patchUpdate);

router.post('/:id/archive', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(archiveAssignmentSchema), postArchive);
router.delete('/:id', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(archiveAssignmentSchema), postArchive);

export default router;