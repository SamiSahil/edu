import { env } from './env.js';

function parseAllowedOrigins() {
  return String(env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isNetlifyOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith('.netlify.app');
  } catch {
    return false;
  }
}

export function buildCorsOptions() {
  const allowed = parseAllowedOrigins();

  return {
    origin: (origin, callback) => {
      // server-to-server / same origin calls
      if (!origin) return callback(null, true);

      // allow explicitly configured origins
      if (allowed.includes(origin)) return callback(null, true);

      // allow any netlify app subdomain (optional but very useful)
      if (isNetlifyOrigin(origin)) return callback(null, true);

      return callback(null, false); // IMPORTANT: don't throw Error; just deny
    },

    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-School-Id'],
    exposedHeaders: ['X-Request-Id'],
  };
}