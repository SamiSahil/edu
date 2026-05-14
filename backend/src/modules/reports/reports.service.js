import { prisma } from '../../infra/prisma/client.js';

function monthBounds(monthKey) {
  const [yy, mm] = String(monthKey).split('-').map(Number);
  const start = new Date(Date.UTC(yy, (mm || 1) - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(yy, mm || 1, 1, 0, 0, 0, 0)); // next month start
  return { start, end };
}

function inMonthYmd(dateYmd, monthKey) {
  return String(dateYmd || '').startsWith(`${monthKey}-`);
}

function percentage(part, total) {
  if (!total) return 0;
  return Math.round((Number(part) / Number(total)) * 100);
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

export async function buildReports({ schoolId, filters }) {
  const monthKey = filters.month || new Date().toISOString().slice(0, 7);
  const { start, end } = monthBounds(monthKey);

  const classId = filters.classId || '';
  const sectionId = filters.sectionId || '';
  const staffRole = filters.role || '';

  // Students scoped by class/section filters
  const students = await prisma.student.findMany({
    where: {
      schoolId,
      isArchived: false,
      ...(classId ? { classId } : {}),
      ...(sectionId ? { sectionId } : {}),
    },
    select: { id: true },
  });
  const studentIds = students.map((s) => s.id);

  // Attendance for month and filtered students
  const attendanceAll = await prisma.attendanceRecord.findMany({
    where: { schoolId, isArchived: false },
    orderBy: { date: 'desc' },
  });
  const attendance = attendanceAll
    .filter((a) => inMonthYmd(a.date, monthKey))
    .filter((a) => (!studentIds.length ? true : studentIds.includes(a.studentId)));

  // Fees
  const invoices = await prisma.invoice.findMany({
    where: {
      schoolId,
      isArchived: false,
      issuedAt: { gte: start, lt: end },
      ...(studentIds.length ? { studentId: { in: studentIds } } : {}),
    },
    include: { items: true },
  });

  const payments = await prisma.payment.findMany({
    where: {
      schoolId,
      isArchived: false,
      paidAt: { gte: start, lt: end },
      ...(studentIds.length ? { studentId: { in: studentIds } } : {}),
    },
  });

  // Exams (optionally class-filtered)
  const exams = await prisma.exam.findMany({
    where: {
      schoolId,
      isArchived: false,
      ...(classId ? { classId } : {}),
    },
    orderBy: { scheduledFor: 'desc' },
  });

  // Staff (optionally role-filtered)
  const staff = await prisma.staff.findMany({
    where: {
      schoolId,
      isArchived: false,
      ...(staffRole ? { roleLabel: staffRole } : {}),
    },
    select: { id: true },
  });

  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const lateCount = attendance.filter((a) => a.status === 'late').length;
  const absentCount = attendance.filter((a) => a.status === 'absent').length;

  const feeCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalsMap = await invoiceTotalsForInvoices(invoices.map((i) => i.id));
  const feeDue = invoices.reduce((sum, inv) => sum + computeInvoiceBalance(inv, totalsMap.get(inv.id) || 0), 0);

  const summary = {
    monthKey,
    attendanceRate: percentage(presentCount + lateCount, attendance.length || 1),
    presentCount,
    absentCount,
    feeCollected,
    feeDue,
    invoiceCount: invoices.length,
    examCount: exams.length,
    studentCount: students.length,
    staffCount: staff.length,
    paymentCount: payments.length,
  };

  return {
    summary,
    counts: {
      attendance: attendance.length,
      invoices: invoices.length,
      payments: payments.length,
      exams: exams.length,
    },
  };
}