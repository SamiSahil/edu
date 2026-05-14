import { ok } from '../../shared/http/response.js';
import { buildReports } from './reports.service.js';

export async function getReports(req, res) {
  const filters = {
    month: req.query.month || new Date().toISOString().slice(0, 7),
    classId: req.query.classId || '',
    sectionId: req.query.sectionId || '',
    role: req.query.role || '',
    category: req.query.category || '',
  };

  const data = await buildReports({
    schoolId: req.school.id,
    filters,
  });

  return ok(res, data);
}