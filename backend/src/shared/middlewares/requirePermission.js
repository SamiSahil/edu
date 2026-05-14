import { AppError } from '../errors/AppError.js';

// Keep this aligned with your frontend `roleCapabilities` (Super Admin removed)
const roleCapabilities = {
  Admin: ['*'],
  Principal: [
    'dashboard', 'admissions', 'students', 'staff', 'academics', 'attendance',
    'exams', 'assignments', 'communication', 'reports', 'settings', 'profile', 'transport'
  ],
  Teacher: [
    'dashboard', 'students', 'academics', 'attendance',
    'exams', 'assignments', 'communication', 'profile'
  ],
  Accountant: ['dashboard', 'finance', 'reports', 'profile'],
  Librarian: ['dashboard', 'library', 'reports', 'profile'],
  Student: ['dashboard', 'students', 'academics', 'attendance', 'exams', 'assignments', 'communication', 'profile'],
  Parent: ['dashboard', 'students', 'academics', 'attendance', 'finance', 'assignments', 'communication', 'profile'],
};

export function requirePermission(moduleKey) {
  return (req, res, next) => {
    const role = req.school?.role;
    if (!role) throw new AppError('School context missing.', 500, 'SERVER_STATE');

    const allowed = roleCapabilities[role] || [];
    const ok = allowed.includes('*') || allowed.includes(moduleKey);

    if (!ok) {
      throw new AppError('Access denied for this module.', 403, 'FORBIDDEN', {
        role,
        module: moduleKey,
      });
    }

    next();
  };
}