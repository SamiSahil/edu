import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';

export function requireAuth(req, res, next) {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';

  if (!token) {
    throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.auth = {
      userId: payload.userId,
      activeSchoolId: payload.activeSchoolId || null,
    };
    if (!req.auth.userId) throw new Error('Invalid token payload.');
    next();
  } catch {
    throw new AppError('Invalid or expired token.', 401, 'UNAUTHORIZED');
  }
}