import { created, ok } from '../../shared/http/response.js';

import {
  archiveStudent,
  createStudent,
  getStudentById,
  listStudents,
  promoteStudent,
  transferStudent,
  updateStudent,
} from './students.service.js';

export async function getList(req, res) {
  const result = await listStudents({
    schoolId: req.school.id,
    userId: req.auth.userId,         // ✅ added for teacher scope
    role: req.school.role,
    query: req.query,
  });

  return ok(res, result.items, result.meta);
}

export async function getDetail(req, res) {
  const student = await getStudentById({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    id: req.params.id,
  });

  return ok(res, student);
}

export async function postCreate(req, res) {
  const student = await createStudent({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });

  return created(res, student);
}

export async function patchUpdate(req, res) {
  const student = await updateStudent({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    payload: req.body,
  });

  return ok(res, student);
}

export async function postArchive(req, res) {
  const updated = await archiveStudent({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
  });

  return ok(res, updated);
}

export async function postPromote(req, res) {
  const updated = await promoteStudent({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    nextClassId: req.body.nextClassId,
    nextSectionId: req.body.nextSectionId,
  });

  return ok(res, updated);
}

export async function postTransfer(req, res) {
  const updated = await transferStudent({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    reason: req.body.reason,
  });

  return ok(res, updated);
}