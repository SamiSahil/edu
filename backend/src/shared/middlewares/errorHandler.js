import { AppError } from '../errors/AppError.js';
import { fail } from '../http/response.js';

function isPrismaKnownError(err) {
  return Boolean(err && typeof err === 'object' && err.code && String(err.code).startsWith('P'));
}

export function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  const _next = next;

  if (res.headersSent) return;

  if (err instanceof AppError) {
    return fail(res, err.statusCode, err.message, err.code, err.details, req.requestId);
  }

  if (isPrismaKnownError(err)) {
    // Common Prisma errors mapping (minimal; we’ll expand later if needed)
    if (err.code === 'P2002') {
      return fail(
        res,
        409,
        'Unique constraint failed.',
        'CONFLICT',
        { target: err.meta?.target },
        req.requestId
      );
    }
    return fail(res, 400, 'Database error.', 'DB_ERROR', { code: err.code, meta: err.meta }, req.requestId);
  }

  // eslint-disable-next-line no-console
  console.error(err);

  return fail(res, 500, 'Internal server error.', 'INTERNAL_ERROR', null, req.requestId);
}