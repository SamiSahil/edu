import { ok } from '../../shared/http/response.js';
import { listMySchools, selectSchool } from './tenancy.service.js';

export async function getMySchools(req, res) {
  const items = await listMySchools(req.auth.userId);
  return ok(res, items);
}

export async function postSelectSchool(req, res) {
  const data = await selectSchool({
    userId: req.auth.userId,
    schoolId: req.body.schoolId,
  });
  return ok(res, data);
}