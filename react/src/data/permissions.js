import { matchPath } from 'react-router-dom';

// Align with backend requirePermission() capabilities
export const roleCapabilities = {
  Admin: ['*'],
  Principal: [
    'dashboard', 'admissions', 'students', 'staff', 'academics', 'attendance',
    'exams', 'assignments', 'communication', 'reports', 'settings', 'profile', 'transport',
  ],
  Teacher: ['dashboard', 'students', 'academics', 'attendance', 'exams', 'assignments', 'communication', 'profile'],
  Accountant: ['dashboard', 'finance', 'reports', 'profile'],
  Librarian: ['dashboard', 'library', 'reports', 'profile'],
  Student: ['dashboard', 'students', 'academics', 'attendance', 'exams', 'assignments', 'communication', 'profile'],
  Parent: ['dashboard', 'students', 'academics', 'attendance', 'finance', 'assignments', 'communication', 'profile'],
};

export const routeRules = [
  { path: '/dashboard', module: 'dashboard' },
  { path: '/students', module: 'students' },
  { path: '/students/:id', module: 'students' },
  { path: '/admissions', module: 'admissions' },
  { path: '/admissions/:id', module: 'admissions' },
  { path: '/academics/classes-sections', module: 'academics' },
  { path: '/academics/subjects', module: 'academics' },
  { path: '/academics/timetable', module: 'academics' },
  { path: '/attendance/mark', module: 'attendance' },
  { path: '/attendance/reports', module: 'attendance' },
  { path: '/fees/structure', module: 'finance' },
  { path: '/fees/invoices', module: 'finance' },
  { path: '/fees/payments', module: 'finance' },
  { path: '/exams', module: 'exams' },
  { path: '/exams/:id', module: 'exams' },
  { path: '/exams/grades', module: 'exams' },
  { path: '/exams/report-cards', module: 'exams' },
  { path: '/assignments', module: 'assignments' },
  { path: '/assignments/:id', module: 'assignments' },
  { path: '/communication', module: 'communication' },
  { path: '/library/books', module: 'library' },
  { path: '/library/issue-return', module: 'library' },
  { path: '/transport/routes', module: 'transport' },
  { path: '/transport/vehicles', module: 'transport' },
  { path: '/staff', module: 'staff' },
  { path: '/staff/:id', module: 'staff' },
  { path: '/reports', module: 'reports' },
  { path: '/settings/school', module: 'settings' },
  { path: '/settings/roles', module: 'settings' },
  { path: '/settings/academic', module: 'settings' },
  { path: '/settings/notifications', module: 'settings' },
  { path: '/profile', module: 'profile' },
  { path: '/access-denied', module: '*' },
];

export function canAccessModule(role, module) {
  const capabilities = roleCapabilities[role] || [];
  return capabilities.includes('*') || capabilities.includes(module);
}

export function canAccessPath(role, pathname) {
  const rule = routeRules.find((entry) => matchPath({ path: entry.path, end: true }, pathname));
  if (!rule) return true;
  if (rule.module === '*') return true;
  return canAccessModule(role, rule.module);
}

export function hasAnyRole(role, roles = []) {
  if (!roles?.length) return true;
  return roles.includes(role) || roles.includes('*');
}