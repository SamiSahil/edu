import { canAccessModule, canAccessPath, hasAnyRole } from './permissions.js';

export const menuGroups = [
  {
    group: 'Overview',
    items: [{ label: 'Dashboard', path: '/dashboard', module: 'dashboard', roles: ['*'] }],
  },
  {
    group: 'Admissions',
    items: [{ label: 'Admissions', path: '/admissions', module: 'admissions', roles: ['Admin', 'Principal'] }],
  },
  {
    group: 'People',
    items: [
      { label: 'Students', path: '/students', module: 'students', roles: ['Admin', 'Principal', 'Teacher'] },
      { label: 'Staff', path: '/staff', module: 'staff', roles: ['Admin', 'Principal'] },
    ],
  },
  {
    group: 'Academics',
    items: [
      { label: 'Classes & Sections', path: '/academics/classes-sections', module: 'academics', roles: ['Admin', 'Principal', 'Teacher'] },
      { label: 'Subjects', path: '/academics/subjects', module: 'academics', roles: ['Admin', 'Principal', 'Teacher'] },
      { label: 'Timetable', path: '/academics/timetable', module: 'academics', roles: ['*'] },
      { label: 'Attendance Marking', path: '/attendance/mark', module: 'attendance', roles: ['Admin', 'Principal', 'Teacher'] },
      { label: 'Attendance Reports', path: '/attendance/reports', module: 'attendance', roles: ['Admin', 'Principal', 'Teacher', 'Student', 'Parent'] },
      { label: 'Exams', path: '/exams', module: 'exams', roles: ['*'] },
      { label: 'Grades (Entry)', path: '/exams/grades', module: 'exams', roles: ['Admin', 'Principal', 'Teacher'] },
      { label: 'Report Cards', path: '/exams/report-cards', module: 'exams', roles: ['Admin', 'Principal', 'Teacher', 'Student', 'Parent'] },
      { label: 'Assignments', path: '/assignments', module: 'assignments', roles: ['*'] },
    ],
  },
  {
    group: 'Finance',
    items: [
      { label: 'Fee Structure', path: '/fees/structure', module: 'finance', roles: ['Admin', 'Accountant'] },
      { label: 'Invoices', path: '/fees/invoices', module: 'finance', roles: ['Admin', 'Accountant', 'Parent'] },
      { label: 'Payments', path: '/fees/payments', module: 'finance', roles: ['Admin', 'Accountant'] },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Library Books', path: '/library/books', module: 'library', roles: ['Admin', 'Librarian'] },
      { label: 'Issue / Return', path: '/library/issue-return', module: 'library', roles: ['Admin', 'Librarian'] },
      { label: 'Transport Routes', path: '/transport/routes', module: 'transport', roles: ['Admin', 'Principal'] },
      { label: 'Vehicles', path: '/transport/vehicles', module: 'transport', roles: ['Admin', 'Principal'] },
    ],
  },
  {
    group: 'Communication',
    items: [{ label: 'Communications', path: '/communication', module: 'communication', roles: ['*'] }],
  },
  {
    group: 'Reports',
    items: [{ label: 'Reports Dashboard', path: '/reports', module: 'reports', roles: ['Admin', 'Principal', 'Accountant', 'Librarian'] }],
  },
  {
    group: 'Settings',
    items: [
      { label: 'School Settings', path: '/settings/school', module: 'settings', roles: ['Admin'] },
      { label: 'Roles & Permissions', path: '/settings/roles', module: 'settings', roles: ['Admin'] },
      { label: 'Academic Settings', path: '/settings/academic', module: 'settings', roles: ['Admin'] },
      { label: 'Notification Settings', path: '/settings/notifications', module: 'settings', roles: ['Admin'] },
    ],
  },
  {
    group: 'Profile',
    items: [{ label: 'Profile', path: '/profile', module: 'profile', roles: ['*'] }],
  },
];

function isItemAllowed(role, item) {
  if (!hasAnyRole(role, item.roles || ['*'])) return false;
  if (item.module && !canAccessModule(role, item.module)) return false;
  const pathnameOnly = String(item.path || '').split('?')[0];
  if (pathnameOnly && !canAccessPath(role, pathnameOnly)) return false;
  return true;
}

export function getVisibleMenu(role) {
  return menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isItemAllowed(role, item)),
    }))
    .filter((group) => group.items.length > 0);
}

export function getPrimaryAction(pathname, role) {
  const actions = [
    {
      test: '/dashboard',
      options: {
        Teacher: { label: 'Mark attendance', path: '/attendance/mark', module: 'attendance', roles: ['Teacher', 'Admin', 'Principal'] },
        Accountant: { label: 'Open invoices', path: '/fees/invoices', module: 'finance', roles: ['Accountant', 'Admin'] },
        Librarian: { label: 'Open catalog', path: '/library/books', module: 'library', roles: ['Librarian', 'Admin'] },
        Student: { label: 'View timetable', path: '/academics/timetable', module: 'academics', roles: ['Student'] },
        Parent: { label: 'Child attendance', path: '/attendance/reports', module: 'attendance', roles: ['Parent'] },
        default: { label: 'Review admissions', path: '/admissions', module: 'admissions', roles: ['Admin', 'Principal'] },
      },
    },
    { test: '/students', label: 'Add student', path: '/students?form=new', module: 'students', roles: ['Teacher', 'Admin', 'Principal'] },
    { test: '/admissions', label: 'New admission', path: '/admissions?form=new', module: 'admissions', roles: ['Admin', 'Principal'] },
    { test: '/academics', label: 'Review timetable', path: '/academics/timetable', module: 'academics', roles: ['*'] },
    { test: '/attendance/reports', label: 'Mark attendance', path: '/attendance/mark', module: 'attendance', roles: ['Teacher', 'Admin', 'Principal'] },
    { test: '/attendance', label: 'Attendance reports', path: '/attendance/reports', module: 'attendance', roles: ['*'] },
    { test: '/fees/structure', label: 'Create invoice', path: '/fees/invoices?form=new', module: 'finance', roles: ['Accountant', 'Admin'] },
    { test: '/fees/invoices', label: 'Create invoice', path: '/fees/invoices?form=new', module: 'finance', roles: ['Accountant', 'Admin'] },
    { test: '/fees/payments', label: 'Record payment', path: '/fees/payments?form=new', module: 'finance', roles: ['Accountant', 'Admin'] },
    { test: '/exams/report-cards', label: 'Open exams', path: '/exams', module: 'exams', roles: ['*'] },
    { test: '/exams', label: 'Create exam', path: '/exams?form=new', module: 'exams', roles: ['Teacher', 'Admin', 'Principal'] },
    { test: '/assignments', label: 'New assignment', path: '/assignments?form=new', module: 'assignments', roles: ['Teacher', 'Admin', 'Principal'] },
    { test: '/communication', label: 'Compose', path: '/communication?compose=new', module: 'communication', roles: ['*'] },
    { test: '/library/books', label: 'Add book', path: '/library/books?form=new', module: 'library', roles: ['Librarian', 'Admin'] },
    { test: '/transport', label: 'Review routes', path: '/transport/routes', module: 'transport', roles: ['Admin', 'Principal'] },
    { test: '/staff', label: 'Add staff', path: '/staff?form=new', module: 'staff', roles: ['Admin', 'Principal'] },
    { test: '/reports', label: 'Export summary', path: '/reports', module: 'reports', roles: ['Admin', 'Principal', 'Accountant', 'Librarian'] },
    { test: '/settings', label: 'Save settings', path: '/settings/school', module: 'settings', roles: ['Admin'] },
    { test: '/profile', label: 'Update profile', path: '/profile', module: 'profile', roles: ['*'] },
  ];

  const isAllowed = (candidate) => {
    if (!candidate) return false;
    if (!hasAnyRole(role, candidate.roles || ['*'])) return false;
    if (candidate.module && !canAccessModule(role, candidate.module)) return false;
    const pathnameOnly = String(candidate.path || '').split('?')[0];
    if (pathnameOnly && !canAccessPath(role, pathnameOnly)) return false;
    return true;
  };

  const matched = actions.find((action) => pathname.startsWith(action.test));
  if (!matched) return { label: 'Open dashboard', path: '/dashboard' };

  if (matched.options) {
    const candidate = matched.options[role] || matched.options.default;
    return isAllowed(candidate) ? candidate : { label: 'Open dashboard', path: '/dashboard' };
  }

  return isAllowed(matched) ? matched : { label: 'Open dashboard', path: '/dashboard' };
}