const RAW_BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const API_ROOT = RAW_BASE.endsWith('/api/v1') ? RAW_BASE : `${RAW_BASE}/api/v1`;

const SCHOOL_STORAGE_KEY = 'sms_active_school_id';

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
}
export function getAccessToken() {
  return accessToken;
}

export function setPreferredSchoolId(schoolId) {
  try {
    if (!schoolId) localStorage.removeItem(SCHOOL_STORAGE_KEY);
    else localStorage.setItem(SCHOOL_STORAGE_KEY, String(schoolId));
  } catch {
    // ignore
  }
}

export function getPreferredSchoolId() {
  try {
    return String(localStorage.getItem(SCHOOL_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

function buildUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_ROOT}${cleanPath}`;
}

function makeApiError({ res, json }) {
  const message = json?.error?.message || `Request failed (${res.status})`;
  const err = new Error(message);
  err.status = res.status;
  err.code = json?.error?.code;
  err.details = json?.error?.details;
  err.requestId = json?.requestId || res.headers.get('x-request-id') || null;
  return err;
}

function attachHeaders(headers) {
  const preferredSchoolId = getPreferredSchoolId();
  if (preferredSchoolId) headers['X-School-Id'] = preferredSchoolId;
  return headers;
}

async function tryRefreshToken() {
  const headers = attachHeaders({});

  const refreshRes = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers,
    credentials: 'include',
  });

  if (!refreshRes.ok) return null;

  const refreshJson = await refreshRes.json().catch(() => null);
  const newToken = refreshJson?.data?.accessToken || null;

  if (newToken) setAccessToken(newToken);
  return newToken;
}

async function request(path, { method = 'GET', body, auth = true, retryOnAuthError = true } = {}) {
  let headers = attachHeaders({ 'Content-Type': 'application/json' });

  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const url = buildUrl(path);

  let res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (res.status === 401 && auth && retryOnAuthError) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      headers = attachHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newToken}`,
      });

      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });
    }
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) throw makeApiError({ res, json });

  return {
    data: json?.data ?? null,
    meta: json?.meta ?? null,
    requestId: json?.requestId ?? res.headers.get('x-request-id') ?? null,
  };
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};