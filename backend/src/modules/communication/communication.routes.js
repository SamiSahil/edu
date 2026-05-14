import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import {
  archiveCommunicationSchema,
  createCommunicationSchema,
  updateCommunicationSchema,
  lookupsQuerySchema,
} from './communication.schemas.js';

import {
  getDetail,
  getList,
  patchUpdate,
  postArchive,
  postCreate,
  getLookups,
} from './communication.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    }
    req.body = parsed.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query || {});
    if (!parsed.success) {
      throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    }
    req.query = parsed.data;
    next();
  };
}

// Compose roles
const COMPOSE_ROLES = ['Admin', 'Principal', 'Teacher', 'Accountant', 'Librarian'];

router.use(requireAuth, requireSchoolContext, requirePermission('communication'));

// Everyone can view list (scoped in service)
router.get('/', getList);

// IMPORTANT: /lookups must be registered BEFORE "/:id"
router.get('/lookups', requireRole(COMPOSE_ROLES), validateQuery(lookupsQuerySchema), getLookups);

// Detail route AFTER /lookups
router.get('/:id', getDetail);

// Only compose roles can create/edit/archive
router.post('/', requireRole(COMPOSE_ROLES), validateBody(createCommunicationSchema), postCreate);
router.patch('/:id', requireRole(COMPOSE_ROLES), validateBody(updateCommunicationSchema), patchUpdate);

router.post('/:id/archive', requireRole(COMPOSE_ROLES), validateBody(archiveCommunicationSchema), postArchive);
router.delete('/:id', requireRole(COMPOSE_ROLES), validateBody(archiveCommunicationSchema), postArchive);

export default router;