import { created, ok } from '../../shared/http/response.js';
import {
  archiveAssignment,
  createAssignment,
  getAssignmentById,
  listAssignments,
  updateAssignment,
} from './assignments.service.js';

export async function getList(req, res) {
  const result = await listAssignments({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    query: req.query,
  });
  return ok(res, result.items, result.meta);
}

export async function getDetail(req, res) {
  const item = await getAssignmentById({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    id: req.params.id,
  });
  return ok(res, item);
}

export async function postCreate(req, res) {
  const item = await createAssignment({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });
  return created(res, item);
}

export async function patchUpdate(req, res) {
  const item = await updateAssignment({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    payload: req.body,
  });
  return ok(res, item);
}

export async function postArchive(req, res) {
  const item = await archiveAssignment({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    reason: req.body?.reason || '',
  });
  return ok(res, item);
}