import { created, ok } from '../../shared/http/response.js';

import {
  adminCreateUser,
  changePassword,
  getMeUser,
  linkUserToStudent,
  listSchoolUsers,
  unlinkUserFromStudent,
  updateMeUser,
} from './users.service.js';

export async function getMe(req, res) {
  const data = await getMeUser({
    userId: req.auth.userId,
    activeSchoolId: req.auth.activeSchoolId,
  });
  return ok(res, data);
}

export async function patchMe(req, res) {
  const user = await updateMeUser({
    userId: req.auth.userId,
    payload: req.body,
  });
  return ok(res, user);
}

export async function postChangePassword(req, res) {
  const result = await changePassword({
    userId: req.auth.userId,
    currentPassword: req.body.currentPassword,
    nextPassword: req.body.nextPassword,
  });
  return ok(res, result);
}

// Admin endpoints
export async function getSchoolUsers(req, res) {
  const items = await listSchoolUsers({ schoolId: req.school.id });
  return ok(res, items);
}

export async function postCreateUser(req, res) {
  const user = await adminCreateUser({
    schoolId: req.school.id,
    adminUserId: req.auth.userId,
    payload: req.body,
  });
  return created(res, { id: user.id, name: user.name, email: user.email, username: user.username });
}

export async function postLinkStudent(req, res) {
  const link = await linkUserToStudent({
    schoolId: req.school.id,
    adminUserId: req.auth.userId,
    userId: req.params.id,
    studentId: req.body.studentId,
    role: req.body.role,
  });
  return ok(res, link);
}

export async function postUnlinkStudent(req, res) {
  const result = await unlinkUserFromStudent({
    schoolId: req.school.id,
    adminUserId: req.auth.userId,
    userId: req.params.id,
    studentId: req.body.studentId,
  });
  return ok(res, result);
}