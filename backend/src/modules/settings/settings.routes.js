import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import { updateSchoolSchema } from '../schools/schools.schemas.js';
import { getRolesMatrix, getSchoolSettings, patchSchoolSettings } from './settings.controller.js';

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

// Settings are Admin-only in your frontend
router.get('/roles', requireRole(['Admin']), getRolesMatrix);

router.get('/school', requireRole(['Admin']), getSchoolSettings);
router.patch('/school', requireRole(['Admin']), validateBody(updateSchoolSchema), patchSchoolSettings);

export default router;