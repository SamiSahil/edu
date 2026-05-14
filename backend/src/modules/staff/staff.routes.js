import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import { createStaffSchema, updateStaffSchema } from './staff.schemas.js';
import { getDetail, getList, patchUpdate, postArchive, postCreate } from './staff.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.body = parsed.data;
    next();
  };
}

router.use(requireAuth, requireSchoolContext, requirePermission('staff'));

// Staff/HR is Admin + Principal only (matches your frontend routes)
router.get('/', requireRole(['Admin', 'Principal']), getList);
router.get('/:id', requireRole(['Admin', 'Principal']), getDetail);

router.post('/', requireRole(['Admin', 'Principal']), validateBody(createStaffSchema), postCreate);
router.patch('/:id', requireRole(['Admin', 'Principal']), validateBody(updateStaffSchema), patchUpdate);

router.post('/:id/archive', requireRole(['Admin', 'Principal']), postArchive);
router.delete('/:id', requireRole(['Admin', 'Principal']), postArchive);

export default router;