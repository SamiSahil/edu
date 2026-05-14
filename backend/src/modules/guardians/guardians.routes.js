import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import { createGuardianSchema, updateGuardianSchema } from './guardians.schemas.js';
import { getDetail, getList, patchUpdate, postArchive, postCreate } from './guardians.controller.js';

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

// Protect under students permission (guardians are part of student management)
router.use(requireAuth, requireSchoolContext, requirePermission('students'));

// Staff can list guardians for forms
router.get('/', requireRole(['Admin', 'Principal', 'Teacher']), getList);
router.get('/:id', requireRole(['Admin', 'Principal', 'Teacher']), getDetail);

// Staff can create/edit guardians (teacher allowed because StudentForm needs it)
router.post('/', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(createGuardianSchema), postCreate);
router.patch('/:id', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(updateGuardianSchema), patchUpdate);

router.post('/:id/archive', requireRole(['Admin', 'Principal', 'Teacher']), postArchive);
router.delete('/:id', requireRole(['Admin', 'Principal', 'Teacher']), postArchive);

export default router;