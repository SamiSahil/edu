export function ok(res, data = null, meta = null) {
  return res.status(200).json({ data, meta });
}

export function created(res, data = null, meta = null) {
  return res.status(201).json({ data, meta });
}

export function noContent(res) {
  return res.status(204).send();
}

export function fail(res, statusCode, message, code = 'ERROR', details = null, requestId = null) {
  return res.status(statusCode).json({
    error: { message, code, details },
    requestId: requestId || undefined,
  });
}