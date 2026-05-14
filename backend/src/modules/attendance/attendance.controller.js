import { ok } from '../../shared/http/response.js';
import {
  getAttendanceForDateSection,
  getAttendanceMonthReport,
  markAttendanceBatch,
} from './attendance.service.js';

export async function getForDate(req, res) {
  const items = await getAttendanceForDateSection({
    schoolId: req.school.id,
    role: req.school.role,
    userId: req.auth.userId,
    date: req.query.date,
    sectionId: req.query.sectionId,
  });

  return ok(res, items);
}

export async function postMarkBatch(req, res) {
  const result = await markAttendanceBatch({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    records: req.body.records,
  });

  return ok(res, {
    items: result.items,
    createdCount: result.createdCount,
    updatedCount: result.updatedCount,
  });
}

export async function getMonthReport(req, res) {
  const report = await getAttendanceMonthReport({
    schoolId: req.school.id,
    role: req.school.role,
    userId: req.auth.userId,
    month: req.query.month,
  });

  return ok(res, report);
}