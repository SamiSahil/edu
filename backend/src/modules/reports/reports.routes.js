import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import { reportsQuerySchema } from './reports.schemas.js';
import { getReports } from './reports.controller.js';

const router = Router();

function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.query = parsed.data;
    next();
  };
}

// Reports roles per your frontend: Admin, Principal, Accountant, Librarian
router.use(requireAuth, requireSchoolContext, requirePermission('reports'));
router.get('/', requireRole(['Admin', 'Principal', 'Accountant', 'Librarian']), validateQuery(reportsQuerySchema), getReports);

export default router;