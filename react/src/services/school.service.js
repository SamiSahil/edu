import { loadDatabase, saveDatabase } from './storage.js';
import { compareDateDesc, formatMonth, inMonth, percentage, safeString, sumBy, trendValue } from '../lib/utils.js';

function invoiceTotal(invoice) {
  return (invoice.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

export function getSchoolProfile() {
  return loadDatabase().schoolProfile;
}

export function updateSchoolProfile(updates) {
  const db = loadDatabase();
  db.schoolProfile = { ...db.schoolProfile, ...updates, updatedAt: new Date().toISOString() };
  saveDatabase(db);
  return { success: true, data: db.schoolProfile };
}

export function getDashboardSummary(db, role, monthKey, session = {}) {
  const students = db.students || [];
  const attendance = db.attendanceRecords || [];
  const invoices = db.feeInvoices || [];
  const payments = db.payments || [];
  const assignments = db.assignments || [];
  const books = db.books || [];
  const issues = db.libraryIssues || [];
  const messages = [...(db.announcements || []), ...(db.messages || [])];
  const exams = db.exams || [];

  const monthAttendance = attendance.filter((item) => inMonth(item.date, monthKey));
  const presentCount = monthAttendance.filter((item) => item.status === 'present').length;
  const attendanceRate = percentage(presentCount, monthAttendance.length || 1);
  const previousMonth = new Date(`${monthKey}-01`);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const previousKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
  const previousAttendance = attendance.filter((item) => inMonth(item.date, previousKey));
  const attendanceTrend = trendValue(monthAttendance.length, previousAttendance.length || 0);

  const monthInvoices = invoices.filter((item) => inMonth(item.issuedAt, monthKey));
  const monthPayments = payments.filter((item) => inMonth(item.paidAt, monthKey));
  const dueAmount = monthInvoices.reduce((sum, invoice) => sum + Math.max(0, invoiceTotal(invoice) - Number(invoice.amountPaid || 0) - Number(invoice.waivedAmount || 0)), 0);

  const activity = [...(db.auditLogs || []), ...messages.map((item) => ({ ...item, entityType: 'communication', message: item.title || item.subject }))]
    .sort((a, b) => compareDateDesc(a.createdAt || a.updatedAt || a.paidAt || a.issuedAt || a.date, b.createdAt || b.updatedAt || b.paidAt || b.issuedAt || b.date))
    .slice(0, 7);

  const roleCards = {
    'Super Admin': [
      { label: 'Students', value: students.filter((item) => item.status !== 'archived').length, note: 'active enrollment' },
      { label: 'Attendance', value: `${attendanceRate}%`, note: `${attendanceTrend >= 0 ? '+' : ''}${attendanceTrend}% vs last month` },
      { label: 'Collections', value: monthPayments.length, note: 'payments this month' },
      { label: 'Pending Dues', value: invoices.filter((item) => item.status === 'overdue').length, note: formatMonth(monthKey) },
    ],
    Teacher: [
      { label: 'Classes', value: session.linkedClassIds?.length || 1, note: 'assigned' },
      { label: 'Attendance', value: `${attendanceRate}%`, note: 'today and this month' },
      { label: 'Assignments', value: assignments.filter((item) => item.status === 'published').length, note: 'published tasks' },
      { label: 'Messages', value: messages.filter((item) => item.status !== 'archived').length, note: 'shared notices' },
    ],
    Accountant: [
      { label: 'Collected', value: monthPayments.length, note: 'transactions' },
      { label: 'Due', value: dueAmount, note: 'current month balance' },
      { label: 'Invoices', value: monthInvoices.length, note: 'issued this month' },
      { label: 'Overdue', value: invoices.filter((item) => item.status === 'overdue').length, note: 'follow-up needed' },
    ],
    Librarian: [
      { label: 'Books', value: books.length, note: 'cataloged' },
      { label: 'Issued', value: issues.filter((item) => !item.returnedAt).length, note: 'active issues' },
      { label: 'Available', value: books.filter((item) => item.status === 'available').length, note: 'ready for lending' },
      { label: 'Overdue', value: issues.filter((item) => !item.returnedAt && new Date(item.dueDate) < new Date()).length, note: 'requires attention' },
    ],
    Student: [
      { label: 'Attendance', value: `${attendanceRate}%`, note: 'for selected month' },
      { label: 'Assignments', value: assignments.filter((item) => item.status === 'published').length, note: 'pending tasks' },
      { label: 'Exams', value: exams.filter((item) => item.status === 'published').length, note: 'available results' },
      { label: 'Notices', value: messages.filter((item) => item.status === 'sent').length, note: 'school updates' },
    ],
    Parent: [
      { label: 'Child Attendance', value: `${attendanceRate}%`, note: 'selected month' },
      { label: 'Fee Due', value: dueAmount, note: 'outstanding balance' },
      { label: 'Assignments', value: assignments.filter((item) => item.status === 'published').length, note: 'current homework' },
      { label: 'Notices', value: messages.filter((item) => item.status === 'sent').length, note: 'school updates' },
    ],
  };

  const baseCards = [
    { label: 'Students', value: students.filter((item) => item.status !== 'archived').length, note: 'school wide' },
    { label: 'Attendance', value: `${attendanceRate}%`, note: `${attendanceTrend >= 0 ? '+' : ''}${attendanceTrend}% vs last month` },
    { label: 'Payments', value: monthPayments.length, note: 'this month' },
    { label: 'Active Exams', value: exams.filter((item) => item.status !== 'draft').length, note: 'assessment cycle' },
  ];

  return {
    cards: roleCards[role] || baseCards,
    activity,
    monthAttendance,
    monthInvoices,
    monthPayments,
    monthAssignments: assignments.filter((item) => inMonth(item.dueDate, monthKey) || item.status === 'published'),
    monthMessages: messages,
    attendanceRate,
    dueAmount,
    pendingFees: invoices.filter((item) => item.status === 'overdue' || item.status === 'partial').length,
    totalStudents: students.filter((item) => item.status !== 'archived').length,
    totalBooks: books.length,
  };
}

export function getReportSummary(db, filters = {}) {
  const monthKey = filters.month || new Date().toISOString().slice(0, 7);
  const students = (db.students || []).filter((item) => safeString(item.classId) === safeString(filters.classId) || !filters.classId).filter((item) => safeString(item.sectionId) === safeString(filters.sectionId) || !filters.sectionId);
  const attendance = (db.attendanceRecords || []).filter((item) => inMonth(item.date, monthKey)).filter((item) => !filters.classId || students.some((student) => student.id === item.studentId)).filter((item) => !filters.sectionId || safeString(item.sectionId) === safeString(filters.sectionId));
  const invoices = (db.feeInvoices || []).filter((item) => inMonth(item.issuedAt, monthKey)).filter((item) => !filters.classId || students.some((student) => student.id === item.studentId));
  const payments = (db.payments || []).filter((item) => inMonth(item.paidAt, monthKey)).filter((item) => !filters.classId || students.some((student) => student.id === item.studentId));
  const exams = (db.exams || []).filter((item) => safeString(item.classId) === safeString(filters.classId) || !filters.classId);
  const staff = (db.staff || []).filter((item) => safeString(item.role) === safeString(filters.role) || !filters.role);

  return {
    monthKey,
    attendanceRate: percentage(attendance.filter((item) => item.status === 'present').length, attendance.length || 1),
    presentCount: attendance.filter((item) => item.status === 'present').length,
    absentCount: attendance.filter((item) => item.status === 'absent').length,
    feeCollected: sumBy(payments, 'amount'),
    feeDue: invoices.reduce((sum, invoice) => sum + Math.max(0, invoiceTotal(invoice) - Number(invoice.amountPaid || 0) - Number(invoice.waivedAmount || 0)), 0),
    invoiceCount: invoices.length,
    examCount: exams.length,
    studentCount: students.length,
    staffCount: staff.length,
    paymentCount: payments.length,
  };
}