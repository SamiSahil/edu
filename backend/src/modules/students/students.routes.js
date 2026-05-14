import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import {
  createStudentSchema,
  promoteSchema,
  transferSchema,
  updateStudentSchema,
} from './students.schemas.js';

import {
  getDetail,
  getList,
  patchUpdate,
  postArchive,
  postCreate,
  postPromote,
  postTransfer,
} from './students.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    }
    req.body = parsed.data;
    next();
  };
}

// All students routes require auth + school context
router.use(requireAuth, requireSchoolContext, requirePermission('students'));

// LIST: Staff only (frontend also restricts /students list to staff)
router.get('/', requireRole(['Admin', 'Principal', 'Teacher']), getList);

// DETAIL: staff + parent/student allowed, object-level checks are in service
router.get('/:id', getDetail);

// CREATE/UPDATE/ARCHIVE: staff only
router.post('/', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(createStudentSchema), postCreate);
router.patch('/:id', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(updateStudentSchema), patchUpdate);

// Archive endpoints (support both patterns)
router.post('/:id/archive', requireRole(['Admin', 'Principal', 'Teacher']), postArchive);
router.delete('/:id', requireRole(['Admin', 'Principal', 'Teacher']), postArchive);

// Promote / Transfer
router.post('/:id/promote', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(promoteSchema), postPromote);
router.post('/:id/transfer', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(transferSchema), postTransfer);

export default router;