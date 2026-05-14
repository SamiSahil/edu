// Keep this aligned with frontend `roleCapabilities` (no Super Admin)
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

export function getRoleMatrix() {
  const modules = [
    'dashboard', 'admissions', 'students', 'staff', 'academics', 'attendance', 'exams',
    'assignments', 'communication', 'reports', 'settings', 'finance', 'library', 'transport', 'profile',
  ];

  return {
    modules,
    roles: Object.keys(roleCapabilities).map((role) => ({
      role,
      allowed: roleCapabilities[role],
    })),
  };
}