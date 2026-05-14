import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { canAccessModule, hasAnyRole } from '../data/permissions.js';

import Login from '../pages/auth/Login.jsx';
import ForgotPassword from '../pages/auth/ForgotPassword.jsx';

import Dashboard from '../pages/dashboard/Dashboard.jsx';

import StudentsList from '../pages/students/StudentsList.jsx';
import StudentDetail from '../pages/students/StudentDetail.jsx';

import AdmissionsList from '../pages/admissions/AdmissionsList.jsx';
import AdmissionDetail from '../pages/admissions/AdmissionDetail.jsx';

import ClassesSections from '../pages/academics/ClassesSections.jsx';
import Subjects from '../pages/academics/Subjects.jsx';
import Timetable from '../pages/academics/Timetable.jsx';

import AttendanceMark from '../pages/attendance/AttendanceMark.jsx';
import AttendanceReports from '../pages/attendance/AttendanceReports.jsx';

import FeeStructure from '../pages/fees/FeeStructure.jsx';
import Invoices from '../pages/fees/Invoices.jsx';
import Payments from '../pages/fees/Payments.jsx';

import ExamsList from '../pages/exams/ExamsList.jsx';
import ExamDetail from '../pages/exams/ExamDetail.jsx';
import Grades from '../pages/exams/Grades.jsx';
import ReportCards from '../pages/exams/ReportCards.jsx';

import AssignmentsList from '../pages/assignments/AssignmentsList.jsx';
import AssignmentDetail from '../pages/assignments/AssignmentDetail.jsx';

import Communications from '../pages/communication/Communications.jsx';

import LibraryBooks from '../pages/library/LibraryBooks.jsx';
import IssueReturn from '../pages/library/IssueReturn.jsx';

import TransportRoutes from '../pages/transport/TransportRoutes.jsx';
import Vehicles from '../pages/transport/Vehicles.jsx';

import StaffList from '../pages/staff/StaffList.jsx';
import StaffDetail from '../pages/staff/StaffDetail.jsx';

import ReportsDashboard from '../pages/reports/ReportsDashboard.jsx';

import SchoolSettings from '../pages/settings/SchoolSettings.jsx';
import RolesPermissions from '../pages/settings/RolesPermissions.jsx';
import AcademicSettings from '../pages/settings/AcademicSettings.jsx';
import NotificationSettings from '../pages/settings/NotificationSettings.jsx';

import Profile from '../pages/profile/Profile.jsx';

import AccessDenied from '../pages/errors/AccessDenied.jsx';
import NotFound from '../pages/errors/NotFound.jsx';

const ROLES = {
  ALL_AUTH: ['*'],
  STAFF_ONLY: ['Admin', 'Principal', 'Teacher'],
  ADMIN_ONLY: ['Admin'],
  ADMIN_PRINCIPAL: ['Admin', 'Principal'],
  ACADEMICS_MANAGE: ['Admin', 'Principal', 'Teacher'],
  ATTENDANCE_MARK: ['Admin', 'Principal', 'Teacher'],
  ATTENDANCE_REPORTS: ['Admin', 'Principal', 'Teacher', 'Student', 'Parent'],
  FINANCE_MANAGE: ['Admin', 'Accountant'],
  // IMPORTANT: Student is NOT allowed finance in backend.
  FINANCE_VIEW: ['Admin', 'Accountant', 'Parent'],
  EXAMS_MANAGE: ['Admin', 'Principal', 'Teacher'],
  EXAMS_VIEW: ['Admin', 'Principal', 'Teacher', 'Student', 'Parent'],
  ASSIGNMENTS_VIEW: ['Admin', 'Principal', 'Teacher', 'Student', 'Parent'],
  LIBRARY: ['Admin', 'Librarian'],
  TRANSPORT: ['Admin', 'Principal'],
  STAFF_HR: ['Admin', 'Principal'],
  REPORTS: ['Admin', 'Principal', 'Accountant', 'Librarian'],
  SETTINGS: ['Admin'],
};

function Guard({ module, roles = ['*'], children }) {
  const { role, isAuthenticated, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <div className="min-h-screen bg-zinc-950 text-white" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!hasAnyRole(role, roles)) {
    return <AccessDenied />;
  }

  if (module && !canAccessModule(role, module)) {
    return <AccessDenied />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

function PublicOnly({ children }) {
  const { isAuthenticated, ready } = useAuth();
  if (!ready) return <div className="min-h-screen bg-zinc-950 text-white" />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function RootRedirect() {
  const { isAuthenticated, ready } = useAuth();
  if (!ready) return <div className="min-h-screen bg-zinc-950 text-white" />;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
      Loading Summit School OS...
    </div>
  );
}

export function AppRouter() {
  const { ready: authReady } = useAuth();
  if (!authReady) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnly>
            <ForgotPassword />
          </PublicOnly>
        }
      />

      <Route
        path="/dashboard"
        element={
          <Guard module="dashboard" roles={ROLES.ALL_AUTH}>
            <Dashboard />
          </Guard>
        }
      />

      {/* Students */}
      <Route
        path="/students"
        element={
          <Guard module="students" roles={ROLES.STAFF_ONLY}>
            <StudentsList />
          </Guard>
        }
      />
      <Route
        path="/students/:id"
        element={
          <Guard module="students" roles={['Admin', 'Principal', 'Teacher', 'Student', 'Parent']}>
            <StudentDetail />
          </Guard>
        }
      />

      {/* Admissions */}
      <Route
        path="/admissions"
        element={
          <Guard module="admissions" roles={ROLES.ADMIN_PRINCIPAL}>
            <AdmissionsList />
          </Guard>
        }
      />
      <Route
        path="/admissions/:id"
        element={
          <Guard module="admissions" roles={ROLES.ADMIN_PRINCIPAL}>
            <AdmissionDetail />
          </Guard>
        }
      />

      {/* Academics */}
      <Route
        path="/academics/classes-sections"
        element={
          <Guard module="academics" roles={ROLES.ACADEMICS_MANAGE}>
            <ClassesSections />
          </Guard>
        }
      />
      <Route
        path="/academics/subjects"
        element={
          <Guard module="academics" roles={ROLES.ACADEMICS_MANAGE}>
            <Subjects />
          </Guard>
        }
      />
      <Route
        path="/academics/timetable"
        element={
          <Guard module="academics" roles={['Admin', 'Principal', 'Teacher', 'Student', 'Parent']}>
            <Timetable />
          </Guard>
        }
      />

      {/* Attendance */}
      <Route
        path="/attendance/mark"
        element={
          <Guard module="attendance" roles={ROLES.ATTENDANCE_MARK}>
            <AttendanceMark />
          </Guard>
        }
      />
      <Route
        path="/attendance/reports"
        element={
          <Guard module="attendance" roles={ROLES.ATTENDANCE_REPORTS}>
            <AttendanceReports />
          </Guard>
        }
      />

      {/* Finance */}
      <Route
        path="/fees/structure"
        element={
          <Guard module="finance" roles={ROLES.FINANCE_MANAGE}>
            <FeeStructure />
          </Guard>
        }
      />
      <Route
        path="/fees/invoices"
        element={
          <Guard module="finance" roles={ROLES.FINANCE_VIEW}>
            <Invoices />
          </Guard>
        }
      />
      <Route
        path="/fees/payments"
        element={
          <Guard module="finance" roles={ROLES.FINANCE_MANAGE}>
            <Payments />
          </Guard>
        }
      />

      {/* Exams */}
      <Route
        path="/exams"
        element={
          <Guard module="exams" roles={ROLES.EXAMS_VIEW}>
            <ExamsList />
          </Guard>
        }
      />
      <Route
        path="/exams/:id"
        element={
          <Guard module="exams" roles={ROLES.EXAMS_VIEW}>
            <ExamDetail />
          </Guard>
        }
      />
      <Route
        path="/exams/grades"
        element={
          <Guard module="exams" roles={ROLES.EXAMS_MANAGE}>
            <Grades />
          </Guard>
        }
      />
      <Route
        path="/exams/report-cards"
        element={
          <Guard module="exams" roles={ROLES.EXAMS_VIEW}>
            <ReportCards />
          </Guard>
        }
      />

      {/* Assignments */}
      <Route
        path="/assignments"
        element={
          <Guard module="assignments" roles={ROLES.ASSIGNMENTS_VIEW}>
            <AssignmentsList />
          </Guard>
        }
      />
      <Route
        path="/assignments/:id"
        element={
          <Guard module="assignments" roles={ROLES.ASSIGNMENTS_VIEW}>
            <AssignmentDetail />
          </Guard>
        }
      />

      {/* Communication */}
      <Route
        path="/communication"
        element={
          <Guard module="communication" roles={ROLES.ALL_AUTH}>
            <Communications />
          </Guard>
        }
      />

      {/* Library */}
      <Route
        path="/library/books"
        element={
          <Guard module="library" roles={ROLES.LIBRARY}>
            <LibraryBooks />
          </Guard>
        }
      />
      <Route
        path="/library/issue-return"
        element={
          <Guard module="library" roles={ROLES.LIBRARY}>
            <IssueReturn />
          </Guard>
        }
      />

      {/* Transport */}
      <Route
        path="/transport/routes"
        element={
          <Guard module="transport" roles={ROLES.TRANSPORT}>
            <TransportRoutes />
          </Guard>
        }
      />
      <Route
        path="/transport/vehicles"
        element={
          <Guard module="transport" roles={ROLES.TRANSPORT}>
            <Vehicles />
          </Guard>
        }
      />

      {/* Staff / HR */}
      <Route
        path="/staff"
        element={
          <Guard module="staff" roles={ROLES.STAFF_HR}>
            <StaffList />
          </Guard>
        }
      />
      <Route
        path="/staff/:id"
        element={
          <Guard module="staff" roles={ROLES.STAFF_HR}>
            <StaffDetail />
          </Guard>
        }
      />

      {/* Reports */}
      <Route
        path="/reports"
        element={
          <Guard module="reports" roles={ROLES.REPORTS}>
            <ReportsDashboard />
          </Guard>
        }
      />

      {/* Settings */}
      <Route
        path="/settings/school"
        element={
          <Guard module="settings" roles={ROLES.SETTINGS}>
            <SchoolSettings />
          </Guard>
        }
      />
      <Route
        path="/settings/roles"
        element={
          <Guard module="settings" roles={ROLES.SETTINGS}>
            <RolesPermissions />
          </Guard>
        }
      />
      <Route
        path="/settings/academic"
        element={
          <Guard module="settings" roles={ROLES.SETTINGS}>
            <AcademicSettings />
          </Guard>
        }
      />
      <Route
        path="/settings/notifications"
        element={
          <Guard module="settings" roles={ROLES.SETTINGS}>
            <NotificationSettings />
          </Guard>
        }
      />

      <Route
        path="/profile"
        element={
          <Guard module="profile" roles={ROLES.ALL_AUTH}>
            <Profile />
          </Guard>
        }
      />

      <Route path="/access-denied" element={<AccessDenied />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}