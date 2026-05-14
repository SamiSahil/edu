import { created, ok } from '../../shared/http/response.js';
import {
  archiveGuardian,
  createGuardian,
  getGuardianById,
  listGuardians,
  updateGuardian,
} from './guardians.service.js';

export async function getList(req, res) {
  const result = await listGuardians({ schoolId: req.school.id, query: req.query });
  return ok(res, result.items, result.meta);
}

export async function getDetail(req, res) {
  const guardian = await getGuardianById({ schoolId: req.school.id, id: req.params.id });
  return ok(res, guardian);
}

export async function postCreate(req, res) {
  const guardian = await createGuardian({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });
  return created(res, guardian);
}

export async function patchUpdate(req, res) {
  const guardian = await updateGuardian({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    payload: req.body,
  });
  return ok(res, guardian);
}

export async function postArchive(req, res) {
  const guardian = await archiveGuardian({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
  });
  return ok(res, guardian);
}