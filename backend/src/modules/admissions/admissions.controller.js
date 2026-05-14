import { created, ok } from '../../shared/http/response.js';

import {
  archiveAdmission,
  convertAdmissionToStudent,
  createAdmission,
  getAdmissionById,
  listAdmissions,
  updateAdmission,
} from './admissions.service.js';

export async function getList(req, res) {
  const result = await listAdmissions({ schoolId: req.school.id, query: req.query });
  return ok(res, result.items, result.meta);
}

export async function getDetail(req, res) {
  const admission = await getAdmissionById({ schoolId: req.school.id, id: req.params.id });
  return ok(res, admission);
}

export async function postCreate(req, res) {
  const admission = await createAdmission({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });
  return created(res, admission);
}

export async function patchUpdate(req, res) {
  const admission = await updateAdmission({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    payload: req.body,
  });
  return ok(res, admission);
}

export async function postArchive(req, res) {
  const updated = await archiveAdmission({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
  });
  return ok(res, updated);
}

export async function postConvert(req, res) {
  const result = await convertAdmissionToStudent({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    overrides: req.body || {},
  });

  return ok(res, result);
}