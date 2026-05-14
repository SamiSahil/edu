import { ok } from '../../shared/http/response.js';
import { seedCurrentSchool } from './setup.service.js';

export async function postSeed(req, res) {
  const mode = String(req.body?.mode || 'small').toLowerCase(); // small | k12
  const force = Boolean(req.body?.force || false);

  const result = await seedCurrentSchool({
    schoolId: req.school.id,
    options: { mode, force },
  });

  return ok(res, result);
}