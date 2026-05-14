import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import {
  createExamSchema,
  updateExamSchema,
  upsertMarkSchema,
  upsertMarksBatchSchema,
} from './exams.schemas.js';

import {
  getDetail,
  getList,
  getReportCardsView,
  patchUpdate,
  postCreate,
  postLock,
  postMark,
  postMarksBatch,
  postPublish,
} from './exams.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.body = parsed.data;
    next();
  };
}

router.use(requireAuth, requireSchoolContext, requirePermission('exams'));

// View list/detail: all roles with exams permission
router.get('/', getList);
router.get('/:id', getDetail);

// Manage: Admin/Principal/Teacher (matches frontend)
router.post('/', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(createExamSchema), postCreate);
router.patch('/:id', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(updateExamSchema), patchUpdate);

router.post('/:id/publish', requireRole(['Admin', 'Principal', 'Teacher']), postPublish);
router.post('/:id/lock', requireRole(['Admin', 'Principal', 'Teacher']), postLock);

// Marks entry
router.post('/marks', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(upsertMarkSchema), postMark);
router.post('/marks/batch', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(upsertMarksBatchSchema), postMarksBatch);

// Report cards for an exam
router.get('/:id/report-cards', getReportCardsView);

export default router;