import { created, ok } from '../../shared/http/response.js';

import {
  archiveClass,
  archiveSection,
  archiveSubject,
  archiveTimetableEntry,
  createClass,
  createSection,
  createSubject,
  createTimetableEntry,
  getClassesSections,
  listSubjects,
  listTimetable,
  updateClass,
  updateSection,
  updateSubject,
  updateTimetableEntry,
} from './academics.service.js';

export async function getClassesSectionsView(req, res) {
  const data = await getClassesSections({ schoolId: req.school.id });
  return ok(res, data);
}

// Classes
export async function postClass(req, res) {
  const item = await createClass({ schoolId: req.school.id, userId: req.auth.userId, payload: req.body });
  return created(res, item);
}
export async function patchClass(req, res) {
  const item = await updateClass({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id, payload: req.body });
  return ok(res, item);
}
export async function delClass(req, res) {
  const item = await archiveClass({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id });
  return ok(res, item);
}

// Sections
export async function postSection(req, res) {
  const item = await createSection({ schoolId: req.school.id, userId: req.auth.userId, payload: req.body });
  return created(res, item);
}
export async function patchSection(req, res) {
  const item = await updateSection({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id, payload: req.body });
  return ok(res, item);
}
export async function delSection(req, res) {
  const item = await archiveSection({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id });
  return ok(res, item);
}

// Subjects
export async function getSubjects(req, res) {
  const items = await listSubjects({ schoolId: req.school.id });
  return ok(res, items);
}
export async function postSubject(req, res) {
  const item = await createSubject({ schoolId: req.school.id, userId: req.auth.userId, payload: req.body });
  return created(res, item);
}
export async function patchSubject(req, res) {
  const item = await updateSubject({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id, payload: req.body });
  return ok(res, item);
}
export async function delSubject(req, res) {
  const item = await archiveSubject({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id });
  return ok(res, item);
}

// Timetable
export async function getTimetable(req, res) {
  const items = await listTimetable({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    classId: req.query.classId,
    sectionId: req.query.sectionId,
  });
  return ok(res, items);
}
export async function postTimetable(req, res) {
  const item = await createTimetableEntry({ schoolId: req.school.id, userId: req.auth.userId, payload: req.body });
  return created(res, item);
}
export async function patchTimetable(req, res) {
  const item = await updateTimetableEntry({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id, payload: req.body });
  return ok(res, item);
}
export async function delTimetable(req, res) {
  const item = await archiveTimetableEntry({ schoolId: req.school.id, userId: req.auth.userId, id: req.params.id });
  return ok(res, item);
}