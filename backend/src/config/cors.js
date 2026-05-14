import { env } from './env.js';

export function buildCorsOptions() {
  return {
    origin: (origin, callback) => {
      // Allow same-origin/server-to-server calls (no origin)
      if (!origin) return callback(null, true);

      const allowed = [env.FRONTEND_ORIGIN].filter(Boolean);
      if (allowed.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-School-Id'],
    exposedHeaders: ['X-Request-Id'],
  };
}