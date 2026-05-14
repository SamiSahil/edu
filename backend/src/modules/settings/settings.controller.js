import { ok } from '../../shared/http/response.js';
import { getRoleMatrix } from './settings.service.js';
import { getCurrentSchool, updateCurrentSchool } from '../schools/schools.service.js';

export async function getRolesMatrix(req, res) {
  return ok(res, getRoleMatrix());
}

// alias endpoints for SchoolSettings page
export async function getSchoolSettings(req, res) {
  const school = await getCurrentSchool({ schoolId: req.school.id });
  return ok(res, school);
}

export async function patchSchoolSettings(req, res) {
  const school = await updateCurrentSchool({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });
  return ok(res, school);
}