import { created, ok } from '../../shared/http/response.js';
import { archiveStaff, createStaff, getStaffById, listStaff, updateStaff } from './staff.service.js';

export async function getList(req, res) {
  const result = await listStaff({ schoolId: req.school.id, query: req.query });
  return ok(res, result.items, result.meta);
}

export async function getDetail(req, res) {
  const staff = await getStaffById({ schoolId: req.school.id, id: req.params.id });
  return ok(res, staff);
}

export async function postCreate(req, res) {
  const staff = await createStaff({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });
  return created(res, staff);
}

export async function patchUpdate(req, res) {
  const staff = await updateStaff({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    payload: req.body,
  });
  return ok(res, staff);
}

export async function postArchive(req, res) {
  const staff = await archiveStaff({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
  });
  return ok(res, staff);
}