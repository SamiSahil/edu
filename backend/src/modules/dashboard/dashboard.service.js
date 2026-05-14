import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';

function isStudentLike(role) {
  return role === 'Student' || role === 'Parent';
}

function monthBounds(monthKey) {
  const [yy, mm] = String(monthKey).split('-').map(Number);
  const start = new Date(Date.UTC(yy, (mm || 1) - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(yy, mm || 1, 1, 0, 0, 0, 0)); // next month start
  return { start, end };
}

function inMonthYmd(dateYmd, monthKey) {
  return String(dateYmd || '').startsWith(`${monthKey}-`);
}

async function getLinkedStudentIds({ schoolId, userId }) {
  const links = await prisma.studentLink.findMany({
    where: { schoolId, userId },
    select: { studentId: true },
  });
  return links.map((l) => l.studentId);
}

async function invoiceTotalsForInvoices(invoiceIds) {
  if (!invoiceIds.length) return new Map();

  const items = await prisma.invoiceItem.findMany({
    where: { invoiceId: { in: invoiceIds } },
    select: { invoiceId: true, amount: true },
  });

  const map = new Map();
  for (const it of items) {
    map.set(it.invoiceId, (map.get(it.invoiceId) || 0) + Number(it.amount || 0));
  }
  return map;
}

function computeInvoiceBalance(invoice, total) {
  const paid = Number(invoice.amountPaid || 0);
  const waived = Number(invoice.waivedAmount || 0);
  return Math.max(0, Number(total || 0) - paid - waived);
}

export async function getDashboardSummary({ schoolId, userId, role, monthKey }) {
  if (!monthKey) monthKey = new Date().toISOString().slice(0, 7);

  const { start, end } = monthBounds(monthKey);

  // Student/Parent scoping
  const linkedStudentIds = isStudentLike(role) ? await getLinkedStudentIds({ schoolId, userId }) : null;

  const studentWhere = {
    schoolId,
    isArchived: false,
    ...(isStudentLike(role) ? { id: { in: linkedStudentIds.length ? linkedStudentIds : ['__none__'] } } : {}),
  };

  const [studentsCount, attendanceAll, invoicesAll, paymentsAll, assignmentsAll, communicationsAll, examsAll] =
    await Promise.all([
      prisma.student.count({ where: studentWhere }),

      prisma.attendanceRecord.findMany({
        where: {
          schoolId,
          isArchived: false,
          ...(isStudentLike(role)
            ? { studentId: { in: linkedStudentIds.length ? linkedStudentIds : ['__none__'] } }
            : {}),
        },
        orderBy: { date: 'desc' },
      }),

      prisma.invoice.findMany({
        where: {
          schoolId,
          isArchived: false,
          issuedAt: { gte: start, lt: end },
          ...(isStudentLike(role)
            ? { studentId: { in: linkedStudentIds.length ? linkedStudentIds : ['__none__'] } }
            : {}),
        },
        orderBy: { issuedAt: 'desc' },
      }),

      prisma.payment.findMany({
        where: {
          schoolId,
          isArchived: false,
          paidAt: { gte: start, lt: end },
          ...(isStudentLike(role)
            ? { studentId: { in: linkedStudentIds.length ? linkedStudentIds : ['__none__'] } }
            : {}),
        },
        orderBy: { paidAt: 'desc' },
      }),

      prisma.assignment.findMany({
        where: {
          schoolId,
          isArchived: false,
          ...(isStudentLike(role) ? { status: { in: ['published', 'closed'] } } : {}),
        },
        orderBy: { dueDate: 'desc' },
        take: 50,
      }),

      prisma.communication.findMany({
        where: {
          schoolId,
          isArchived: false,
          ...(isStudentLike(role) ? { status: 'sent' } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      prisma.exam.findMany({
        where: {
          schoolId,
          isArchived: false,
          ...(isStudentLike(role) ? { status: { not: 'draft' } } : {}),
        },
        orderBy: { scheduledFor: 'desc' },
        take: 50,
      }),
    ]);

  const monthAttendance = attendanceAll.filter((a) => inMonthYmd(a.date, monthKey));
  const presentCount = monthAttendance.filter((a) => a.status === 'present').length;
  const lateCount = monthAttendance.filter((a) => a.status === 'late').length;
  const attendanceRate = monthAttendance.length
    ? Math.round(((presentCount + lateCount) / monthAttendance.length) * 100)
    : 0;

  // Due amount: compute from invoice items
  const totalsMap = await invoiceTotalsForInvoices(invoicesAll.map((i) => i.id));
  const dueAmount = invoicesAll.reduce((sum, inv) => {
    const total = totalsMap.get(inv.id) || 0;
    return sum + computeInvoiceBalance(inv, total);
  }, 0);

  // Activity feed: audit logs + communications
  const audit = await prisma.auditLog.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  const activity = [
    ...audit.map((a) => ({
      id: a.id,
      entityType: a.entityType,
      action: a.action,
      message: a.message,
      createdAt: a.createdAt,
    })),
    ...communicationsAll.slice(0, 10).map((c) => ({
      id: c.id,
      entityType: 'communication',
      action: c.status,
      message: c.subject || c.title || 'Communication',
      createdAt: c.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Cards similar to frontend, but safe and tenant-scoped
  const cardsByRole = {
    Admin: [
      { label: 'Students', value: studentsCount, note: 'active enrollment' },
      { label: 'Attendance', value: `${attendanceRate}%`, note: 'selected month' },
      { label: 'Payments', value: paymentsAll.length, note: 'transactions this month' },
      { label: 'Fee Due', value: dueAmount, note: 'outstanding balance' },
    ],
    Principal: [
      { label: 'Students', value: studentsCount, note: 'active enrollment' },
      { label: 'Attendance', value: `${attendanceRate}%`, note: 'selected month' },
      { label: 'Assignments', value: assignmentsAll.filter((a) => a.status === 'published').length, note: 'published tasks' },
      { label: 'Exams', value: examsAll.filter((e) => e.status !== 'draft').length, note: 'non-draft exams' },
    ],
    Teacher: [
      { label: 'Students', value: studentsCount, note: 'school-wide' },
      { label: 'Attendance', value: `${attendanceRate}%`, note: 'selected month' },
      { label: 'Assignments', value: assignmentsAll.filter((a) => a.status === 'published').length, note: 'published tasks' },
      { label: 'Notices', value: communicationsAll.filter((c) => c.status === 'sent').length, note: 'sent communications' },
    ],
    Accountant: [
      { label: 'Payments', value: paymentsAll.length, note: 'transactions' },
      { label: 'Invoices', value: invoicesAll.length, note: 'issued this month' },
      { label: 'Fee Due', value: dueAmount, note: 'outstanding' },
      { label: 'Overdue', value: invoicesAll.filter((i) => new Date(i.dueDate) < new Date() && i.status !== 'paid' && i.status !== 'waived').length, note: 'past due' },
    ],
    Librarian: [
      { label: 'Books', value: await prisma.book.count({ where: { schoolId, isArchived: false } }), note: 'cataloged' },
      { label: 'Issued', value: await prisma.libraryIssue.count({ where: { schoolId, isArchived: false, returnedAt: null } }), note: 'active issues' },
      { label: 'Available', value: await prisma.book.count({ where: { schoolId, isArchived: false, availableCopies: { gt: 0 } } }), note: 'ready to lend' },
      { label: 'Overdue', value: await prisma.libraryIssue.count({ where: { schoolId, isArchived: false, returnedAt: null, dueDate: { lt: new Date() } } }), note: 'late returns' },
    ],
    Student: [
      { label: 'Attendance', value: `${attendanceRate}%`, note: 'linked students' },
      { label: 'Assignments', value: assignmentsAll.filter((a) => a.status === 'published').length, note: 'published' },
      { label: 'Exams', value: examsAll.filter((e) => e.status === 'published' || e.status === 'locked').length, note: 'available' },
      { label: 'Notices', value: communicationsAll.filter((c) => c.status === 'sent').length, note: 'sent' },
    ],
    Parent: [
      { label: 'Attendance', value: `${attendanceRate}%`, note: 'linked students' },
      { label: 'Fee Due', value: dueAmount, note: 'outstanding balance' },
      { label: 'Assignments', value: assignmentsAll.filter((a) => a.status === 'published').length, note: 'published' },
      { label: 'Notices', value: communicationsAll.filter((c) => c.status === 'sent').length, note: 'sent' },
    ],
  };

  const cards = cardsByRole[role] || cardsByRole.Admin;

  return {
    monthKey,
    cards,
    activity,
    attendanceRate,
    dueAmount,
  };
}