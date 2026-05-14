import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

import { buildCorsOptions } from './config/cors.js';
import { env } from './config/env.js';

import { requestId } from './shared/middlewares/requestId.js';
import { notFound } from './shared/middlewares/notFound.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { ok } from './shared/http/response.js';

import authRouter from './modules/auth/auth.routes.js';
import tenancyRouter from './modules/tenancy/tenancy.routes.js';
import filesRouter from './modules/files/files.routes.js';

import dashboardRouter from './modules/dashboard/dashboard.routes.js';
import reportsRouter from './modules/reports/reports.routes.js';

import studentsRouter from './modules/students/students.routes.js';
import guardiansRouter from './modules/guardians/guardians.routes.js';
import admissionsRouter from './modules/admissions/admissions.routes.js';
import academicsRouter from './modules/academics/academics.routes.js';
import attendanceRouter from './modules/attendance/attendance.routes.js';
import staffRouter from './modules/staff/staff.routes.js';
import feesRouter from './modules/fees/fees.routes.js';
import examsRouter from './modules/exams/exams.routes.js';
import assignmentsRouter from './modules/assignments/assignments.routes.js';
import communicationRouter from './modules/communication/communication.routes.js';
import libraryRouter from './modules/library/library.routes.js';
import transportRouter from './modules/transport/transport.routes.js';

import schoolsRouter from './modules/schools/schools.routes.js';
import settingsRouter from './modules/settings/settings.routes.js';
import usersRouter from './modules/users/users.routes.js';
import profileRouter from './modules/profile/profile.routes.js';

import setupRouter from './modules/setup/setup.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    })
  );

  app.use(requestId);
  app.use(helmet());
  app.use(compression());
  app.use(cors(buildCorsOptions()));
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/health', (req, res) => ok(res, { status: 'ok', name: 'Summit School OS API' }));

  // API
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/tenancy', tenancyRouter);
  app.use('/api/v1/files', filesRouter);

  // Dashboard / Reports
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/reports', reportsRouter);

  // Modules
  app.use('/api/v1/students', studentsRouter);
  app.use('/api/v1/guardians', guardiansRouter);
  app.use('/api/v1/admissions', admissionsRouter);
  app.use('/api/v1/academics', academicsRouter);
  app.use('/api/v1/attendance', attendanceRouter);
  app.use('/api/v1/staff', staffRouter);
  app.use('/api/v1/fees', feesRouter);
  app.use('/api/v1/exams', examsRouter);
  app.use('/api/v1/assignments', assignmentsRouter);
  app.use('/api/v1/communication', communicationRouter);
  app.use('/api/v1/library', libraryRouter);
  app.use('/api/v1/transport', transportRouter);

  // Settings/Profile/User management
  app.use('/api/v1/schools', schoolsRouter);
  app.use('/api/v1/settings', settingsRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/profile', profileRouter);

  // Dev-only setup endpoints (service blocks in production)
  app.use('/api/v1/setup', setupRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}