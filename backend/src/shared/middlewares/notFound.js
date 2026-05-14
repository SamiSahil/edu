import { fail } from '../http/response.js';

export function notFound(req, res) {
  return fail(res, 404, 'Route not found.', 'NOT_FOUND', { path: req.originalUrl }, req.requestId);
}