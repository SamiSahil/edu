import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';

import { dashboardSummaryQuerySchema } from './dashboard.schemas.js';
import { getSummary } from './dashboard.controller.js';

const router = Router();

function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.query = parsed.data;
    next();
  };
}

router.use(requireAuth, requireSchoolContext, requirePermission('dashboard'));

router.get('/summary', validateQuery(dashboardSummaryQuerySchema), getSummary);

export default router;