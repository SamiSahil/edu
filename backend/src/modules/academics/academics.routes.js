import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import {
  createClassSchema,
  createSectionSchema,
  createSubjectSchema,
  createTimetableEntrySchema,
  timetableQuerySchema,
  updateClassSchema,
  updateSectionSchema,
  updateSubjectSchema,
  updateTimetableEntrySchema,
} from './academics.schemas.js';

import {
  delClass,
  delSection,
  delSubject,
  delTimetable,
  getClassesSectionsView,
  getSubjects,
  getTimetable,
  patchClass,
  patchSection,
  patchSubject,
  patchTimetable,
  postClass,
  postSection,
  postSubject,
  postTimetable,
} from './academics.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.body = parsed.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.query = parsed.data;
    next();
  };
}

router.use(requireAuth, requireSchoolContext, requirePermission('academics'));

/**
 * Page: Classes & Sections (staff only, matches frontend router)
 */
router.get('/classes-sections', requireRole(['Admin', 'Principal', 'Teacher']), getClassesSectionsView);

// Classes CRUD (staff)
router.post('/classes', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(createClassSchema), postClass);
router.patch('/classes/:id', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(updateClassSchema), patchClass);
router.delete('/classes/:id', requireRole(['Admin', 'Principal', 'Teacher']), delClass);

// Sections CRUD (staff)
router.post('/sections', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(createSectionSchema), postSection);
router.patch('/sections/:id', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(updateSectionSchema), patchSection);
router.delete('/sections/:id', requireRole(['Admin', 'Principal', 'Teacher']), delSection);

/**
 * Page: Subjects (staff only, matches frontend router)
 */
router.get('/subjects', requireRole(['Admin', 'Principal', 'Teacher']), getSubjects);
router.post('/subjects', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(createSubjectSchema), postSubject);
router.patch('/subjects/:id', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(updateSubjectSchema), patchSubject);
router.delete('/subjects/:id', requireRole(['Admin', 'Principal', 'Teacher']), delSubject);

/**
 * Page: Timetable (all roles with academics access can view).
 * Staff can manage entries.
 */
router.get('/timetable', validateQuery(timetableQuerySchema), getTimetable);

router.post('/timetable', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(createTimetableEntrySchema), postTimetable);
router.patch('/timetable/:id', requireRole(['Admin', 'Principal', 'Teacher']), validateBody(updateTimetableEntrySchema), patchTimetable);
router.delete('/timetable/:id', requireRole(['Admin', 'Principal', 'Teacher']), delTimetable);

export default router;