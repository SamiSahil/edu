import { randomUUID } from 'node:crypto';

export function requestId(req, res, next) {
  const incoming = req.header('x-request-id');
  const id = incoming && String(incoming).trim() ? String(incoming).trim() : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}