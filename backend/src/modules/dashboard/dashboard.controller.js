import { ok } from '../../shared/http/response.js';
import { getDashboardSummary } from './dashboard.service.js';

export async function getSummary(req, res) {
  const monthKey = req.query.month || new Date().toISOString().slice(0, 7);

  const data = await getDashboardSummary({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    monthKey,
  });

  return ok(res, data);
}