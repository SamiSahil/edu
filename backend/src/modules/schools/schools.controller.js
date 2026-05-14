import { ok } from '../../shared/http/response.js';
import { getCurrentSchool, updateCurrentSchool } from './schools.service.js';

export async function getCurrent(req, res) {
  const school = await getCurrentSchool({ schoolId: req.school.id });
  return ok(res, school);
}

export async function patchCurrent(req, res) {
  const school = await updateCurrentSchool({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });
  return ok(res, school);
}