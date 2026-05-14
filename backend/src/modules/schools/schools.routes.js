import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import { updateSchoolSchema } from './schools.schemas.js';
import { getCurrent, patchCurrent } from './schools.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.body = parsed.data;
    next();
  };
}

router.use(requireAuth, requireSchoolContext, requirePermission('settings'));

// School settings are Admin-only (matches your frontend Settings access)
router.get('/current', requireRole(['Admin']), getCurrent);
router.patch('/current', requireRole(['Admin']), validateBody(updateSchoolSchema), patchCurrent);

export default router;