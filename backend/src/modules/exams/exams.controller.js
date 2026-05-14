import { created, ok } from '../../shared/http/response.js';

import {
  createExam,
  getExamById,
  getReportCards,
  listExams,
  lockExam,
  publishExam,
  updateExam,
  upsertMark,
  upsertMarksBatch,
} from './exams.service.js';

export async function getList(req, res) {
  const result = await listExams({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    query: req.query,
  });
  return ok(res, result.items, result.meta);
}

export async function getDetail(req, res) {
  const exam = await getExamById({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    id: req.params.id,
  });
  return ok(res, exam);
}

export async function postCreate(req, res) {
  const exam = await createExam({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });
  return created(res, exam);
}

export async function patchUpdate(req, res) {
  const exam = await updateExam({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    payload: req.body,
  });
  return ok(res, exam);
}

export async function postPublish(req, res) {
  const exam = await publishExam({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
  });
  return ok(res, exam);
}

export async function postLock(req, res) {
  const exam = await lockExam({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
  });
  return ok(res, exam);
}

export async function postMark(req, res) {
  const mark = await upsertMark({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });
  return ok(res, mark);
}

export async function postMarksBatch(req, res) {
  const marks = await upsertMarksBatch({
    schoolId: req.school.id,
    userId: req.auth.userId,
    entries: req.body.entries,
  });
  return ok(res, marks);
}

export async function getReportCardsView(req, res) {
  const cards = await getReportCards({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    examId: req.params.id,
  });
  return ok(res, cards);
}