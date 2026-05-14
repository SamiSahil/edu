import { created, ok } from '../../shared/http/response.js';

import {
  archiveAssignment,
  archiveRoute,
  archiveVehicle,
  createAssignment,
  createRoute,
  createVehicle,
  listAssignments,
  listRoutes,
  listVehicles,
  setAssignmentActive,
  updateAssignment,
  updateRoute,
  updateVehicle,
} from './transport.service.js';

export async function getRoutes(req, res) {
  const items = await listRoutes({ schoolId: req.school.id });
  return ok(res, items);
}

export async function getVehicles(req, res) {
  const items = await listVehicles({ schoolId: req.school.id });
  return ok(res, items);
}

export async function getAssignments(req, res) {
  const items = await listAssignments({ schoolId: req.school.id });
  return ok(res, items);
}

export async function postRoute(req, res) {
  const item = await createRoute({ schoolId: req.school.id, userId: req.auth.userId, payload: req.body });
  return created(res, item);
}
export async function patchRoute(req, res) {
  const item = await updateRoute({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id, payload: req.body });
  return ok(res, item);
}
export async function delRoute(req, res) {
  const item = await archiveRoute({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id });
  return ok(res, item);
}

export async function postVehicle(req, res) {
  const item = await createVehicle({ schoolId: req.school.id, userId: req.auth.userId, payload: req.body });
  return created(res, item);
}
export async function patchVehicle(req, res) {
  const item = await updateVehicle({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id, payload: req.body });
  return ok(res, item);
}
export async function delVehicle(req, res) {
  const item = await archiveVehicle({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id });
  return ok(res, item);
}

export async function postAssignment(req, res) {
  const item = await createAssignment({ schoolId: req.school.id, userId: req.auth.userId, payload: req.body });
  return created(res, item);
}
export async function patchAssignment(req, res) {
  const item = await updateAssignment({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id, payload: req.body });
  return ok(res, item);
}
export async function postToggleAssignment(req, res) {
  const item = await setAssignmentActive({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id, active: req.body.active });
  return ok(res, item);
}
export async function delAssignment(req, res) {
  const item = await archiveAssignment({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id });
  return ok(res, item);
}