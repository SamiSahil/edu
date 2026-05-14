import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import { getForDateSchema, markBatchSchema, reportSchema } from './attendance.schemas.js';
import { getForDate, getMonthReport, postMarkBatch } from './attendance.controller.js';

const router = Router();

function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    }
    req.query = parsed.data;
    next();
  };
}

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

router.use(requireAuth, requireSchoolContext, requirePermission('attendance'));

/**
 * Used by AttendanceMark.jsx to pull existing records for date+section.
 * Staff can view any; Student/Parent will only see linked students (enforced in service).
 */
router.get('/for-date', validateQuery(getForDateSchema), getForDate);

/**
 * Mark attendance (batch upsert).
 * Only staff: Admin/Principal/Teacher
 */
router.post(
  '/mark-batch',
  requireRole(['Admin', 'Principal', 'Teacher']),
  validateBody(markBatchSchema),
  postMarkBatch
);

/**
 * Month report used by AttendanceReports.jsx.
 * All attendance roles can access; Student/Parent will be scoped to linked students.
 */
router.get('/reports', validateQuery(reportSchema), getMonthReport);

export default router;