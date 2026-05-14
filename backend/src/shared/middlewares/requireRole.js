import { AppError } from '../errors/AppError.js';

export function requireRole(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    const role = req.school?.role;
    if (!role) throw new AppError('School context missing.', 500, 'SERVER_STATE');

    if (!allowed.length) return next();
    if (!allowed.includes(role)) {
      throw new AppError('Insufficient role permissions.', 403, 'FORBIDDEN', { role, allowed });
    }
    next();
  };
}