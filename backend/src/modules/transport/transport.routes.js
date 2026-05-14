import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import {
  createAssignmentSchema,
  createRouteSchema,
  createVehicleSchema,
  toggleAssignmentSchema,
  updateAssignmentSchema,
  updateRouteSchema,
  updateVehicleSchema,
} from './transport.schemas.js';

import {
  delAssignment,
  delRoute,
  delVehicle,
  getAssignments,
  getRoutes,
  getVehicles,
  patchAssignment,
  patchRoute,
  patchVehicle,
  postAssignment,
  postRoute,
  postToggleAssignment,
  postVehicle,
} from './transport.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.body = parsed.data;
    next();
  };
}

router.use(requireAuth, requireSchoolContext, requirePermission('transport'));

// Frontend transport roles: Admin + Principal
router.use(requireRole(['Admin', 'Principal']));

/**
 * Read endpoints used by your pages
 */
router.get('/routes', getRoutes);
router.get('/vehicles', getVehicles);
router.get('/assignments', getAssignments);

/**
 * Optional CRUD for routes/vehicles (no UI yet, but production-complete)
 */
router.post('/routes', validateBody(createRouteSchema), postRoute);
router.patch('/routes/:id', validateBody(updateRouteSchema), patchRoute);
router.delete('/routes/:id', delRoute);

router.post('/vehicles', validateBody(createVehicleSchema), postVehicle);
router.patch('/vehicles/:id', validateBody(updateVehicleSchema), patchVehicle);
router.delete('/vehicles/:id', delVehicle);

/**
 * Student allocations (used by TransportRoutes.jsx)
 */
router.post('/assignments', validateBody(createAssignmentSchema), postAssignment);
router.patch('/assignments/:id', validateBody(updateAssignmentSchema), patchAssignment);

router.post('/assignments/:id/toggle', validateBody(toggleAssignmentSchema), postToggleAssignment);
router.post('/assignments/:id/archive', delAssignment);
router.delete('/assignments/:id', delAssignment);

export default router;