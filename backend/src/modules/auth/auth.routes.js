import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { AppError } from '../../shared/errors/AppError.js';
import { loginSchema, registerSchema, forgotPasswordSchema } from './auth.schemas.js';
import { login, logout, me, refresh, register, forgotPassword, demoCredentials } from './auth.controller.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
});

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    }
    req.body = parsed.data;
    next();
  };
}

// DEV helper for your frontend demo login buttons
router.get('/demo-credentials', demoCredentials);

// SaaS onboarding endpoint (optional)
router.post('/register', authLimiter, validate(registerSchema), register);

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);

export default router;