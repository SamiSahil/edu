import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { parsePagination, buildPageMeta } from '../../shared/utils/pagination.js';
import { writeAuditLog } from '../audit/audit.service.js';
import { lower, trim } from '../../shared/utils/ids.js';
import { nextSequence } from '../../shared/utils/sequence.js';
function isStudentLike(role) {
  return role === 'Student' || role === 'Parent';
}

async function getLinkedStudentIds({ schoolId, userId }) {
  const links = await prisma.studentLink.findMany({
    where: { schoolId, userId },
    select: { studentId: true },
  });
  return links.map((l) => l.studentId);
}

function sumItems(items = []) {
  return (items || []).reduce((sum, it) => sum + Number(it.amount || 0), 0);
}

function computeInvoiceState({ invoice, items, payments }) {
  const total = sumItems(items);
  const paid = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const waived = Number(invoice.waivedAmount || 0);
  const balance = Math.max(0, total - paid - waived);

  let status = invoice.status;

  if (waived >= total) status = 'waived';
  else if (balance === 0) status = 'paid';
  else if (paid > 0) status = 'partial';
  else status = 'unpaid';

  const dueDate = new Date(invoice.dueDate);
  if (status !== 'waived' && balance > 0 && !Number.isNaN(dueDate.getTime()) && dueDate < new Date()) {
    status = 'overdue';
  }

  return { total, paid, waived, balance, status };
}

function ensureFinanceScope({ role, invoiceStudentId, linkedStudentIds }) {
  if (!isStudentLike(role)) return true;
  if (!linkedStudentIds.includes(invoiceStudentId)) {
    throw new AppError('You do not have access to this invoice.', 403, 'FORBIDDEN');
  }
  return true;
}

/** Fee structures **/
export async function listFeeStructures({ schoolId }) {
  return prisma.feeStructure.findMany({
    where: { schoolId, isArchived: false },
    orderBy: { createdAt: 'desc' },
    include: {
      class: { select: { id: true, name: true } },
      feeHeads: true,
    },
  });
}

export async function createFeeStructure({ schoolId, userId, payload }) {
  const cls = await prisma.class.findFirst({
    where: { schoolId, id: payload.classId, isArchived: false },
    select: { id: true },
  });
  if (!cls) throw new AppError('Class not found.', 400, 'VALIDATION_ERROR', { field: 'classId' });

  const created = await prisma.$transaction(async (tx) => {
    const fs = await tx.feeStructure.create({
      data: {
        schoolId,
        name: trim(payload.name),
        classId: payload.classId,
        period: payload.period,
        active: payload.active !== false,
      },
    });

    if (payload.feeHeads?.length) {
      await tx.feeHead.createMany({
        data: payload.feeHeads.map((h) => ({
          schoolId,
          feeStructureId: fs.id,
          label: trim(h.label),
          amount: Number(h.amount || 0),
        })),
      });
    }

    return fs;
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'feeStructure',
    entityId: created.id,
    action: 'created',
    message: `Fee structure created: ${created.name}`,
  });

  return created;
}

export async function updateFeeStructure({ schoolId, userId, id, payload }) {
  const existing = await prisma.feeStructure.findFirst({ where: { schoolId, id } });
  if (!existing) throw new AppError('Fee structure not found.', 404, 'NOT_FOUND');

  if (payload.classId) {
    const cls = await prisma.class.findFirst({
      where: { schoolId, id: payload.classId, isArchived: false },
      select: { id: true },
    });
    if (!cls) throw new AppError('Class not found.', 400, 'VALIDATION_ERROR', { field: 'classId' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const fs = await tx.feeStructure.update({
      where: { id },
      data: {
        name: payload.name != null ? trim(payload.name) : undefined,
        classId: payload.classId != null ? payload.classId : undefined,
        period: payload.period != null ? payload.period : undefined,
        active: payload.active != null ? Boolean(payload.active) : undefined,
      },
    });

    if (payload.feeHeads) {
      await tx.feeHead.deleteMany({ where: { feeStructureId: id, schoolId } });
      if (payload.feeHeads.length) {
        await tx.feeHead.createMany({
          data: payload.feeHeads.map((h) => ({
            schoolId,
            feeStructureId: id,
            label: trim(h.label),
            amount: Number(h.amount || 0),
          })),
        });
      }
    }

    return fs;
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'feeStructure',
    entityId: id,
    action: 'updated',
    message: `Fee structure updated: ${updated.name}`,
  });

  return updated;
}

export async function archiveFeeStructure({ schoolId, userId, id }) {
  const existing = await prisma.feeStructure.findFirst({ where: { schoolId, id } });
  if (!existing) throw new AppError('Fee structure not found.', 404, 'NOT_FOUND');

  const updated = await prisma.feeStructure.update({
    where: { id },
    data: { isArchived: true, active: false },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'feeStructure',
    entityId: id,
    action: 'archived',
    message: `Fee structure archived: ${existing.name}`,
  });

  return updated;
}

/** Invoices **/
export async function listInvoices({ schoolId, userId, role, query }) {
  const { page, pageSize, skip, take } = parsePagination(query);

  const search = trim(query.search || '');
  const status = trim(query.status || 'all');

  const linkedStudentIds = isStudentLike(role) ? await getLinkedStudentIds({ schoolId, userId }) : null;

  const where = {
    schoolId,
    isArchived: false,
  };

  if (isStudentLike(role)) {
    where.studentId = { in: linkedStudentIds.length ? linkedStudentIds : ['__none__'] };
  }

  if (status !== 'all') {
    where.status = status; // note: overdue is time-dependent; DB status is updated on writes
  }

  if (search) {
    where.OR = [
      { notes: { contains: search, mode: 'insensitive' } },
      { student: { fullName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [totalItems, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      skip,
      take,
      include: {
        student: { select: { id: true, fullName: true } },
        items: true,
        payments: true,
      },
    }),
  ]);

  const items = invoices.map((inv) => {
    const computed = computeInvoiceState({ invoice: inv, items: inv.items, payments: inv.payments });
    return {
      ...inv,
      total: computed.total,
      paid: computed.paid,
      waived: computed.waived,
      balance: computed.balance,
      status: computed.status,
    };
  });

  return { items, meta: buildPageMeta({ page, pageSize, totalItems }) };
}

export async function getInvoiceById({ schoolId, userId, role, id }) {
  const linkedStudentIds = isStudentLike(role) ? await getLinkedStudentIds({ schoolId, userId }) : null;

  const invoice = await prisma.invoice.findFirst({
    where: { schoolId, id, isArchived: false },
    include: { items: true, payments: true, student: true },
  });

  if (!invoice) throw new AppError('Invoice not found.', 404, 'NOT_FOUND');

  ensureFinanceScope({ role, invoiceStudentId: invoice.studentId, linkedStudentIds: linkedStudentIds || [] });

  const computed = computeInvoiceState({ invoice, items: invoice.items, payments: invoice.payments });
  return { ...invoice, ...computed };
}

export async function createInvoice({ schoolId, userId, payload }) {
  const student = await prisma.student.findFirst({
    where: { schoolId, id: payload.studentId, isArchived: false },
    select: { id: true, fullName: true },
  });
  if (!student) throw new AppError('Student not found.', 400, 'VALIDATION_ERROR', { field: 'studentId' });

  const invoiceNo = await nextSequence({ schoolId, key: 'invoiceNo', prefix: 'INV' });

  const created = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        schoolId,
        studentId: payload.studentId,
        invoiceNo,
        invoiceNoLower: lower(invoiceNo),

        issuedAt: new Date(payload.issuedAt),
        dueDate: new Date(payload.dueDate),
        notes: payload.notes ? String(payload.notes) : null,
        amountPaid: 0,
        waivedAmount: 0,
        status: 'unpaid',
      },
    });

    await tx.invoiceItem.createMany({
      data: payload.items.map((it) => ({
        schoolId,
        invoiceId: inv.id,
        label: trim(it.label),
        amount: Number(it.amount || 0),
      })),
    });

    return inv;
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'invoice',
    entityId: created.id,
    action: 'created',
    message: `Invoice ${invoiceNo} created for ${student.fullName}`,
  });

  return getInvoiceById({ schoolId, userId, role: 'Admin', id: created.id });
}

export async function recordPayment({ schoolId, userId, role, payload }) {
  const linkedStudentIds = isStudentLike(role) ? await getLinkedStudentIds({ schoolId, userId }) : null;

  const invoice = await prisma.invoice.findFirst({
    where: { schoolId, id: payload.invoiceId, isArchived: false },
    include: { items: true, payments: true },
  });

  if (!invoice) throw new AppError('Invoice not found.', 404, 'NOT_FOUND');

  ensureFinanceScope({ role, invoiceStudentId: invoice.studentId, linkedStudentIds: linkedStudentIds || [] });

  if (payload.studentId !== invoice.studentId) {
    throw new AppError('Student does not match invoice.', 400, 'VALIDATION_ERROR', { field: 'studentId' });
  }

  const computed = computeInvoiceState({ invoice, items: invoice.items, payments: invoice.payments });

  const amount = Number(payload.amount || 0);
  if (amount <= 0) throw new AppError('Payment amount must be positive.', 400, 'VALIDATION_ERROR');
  if (amount > computed.balance) throw new AppError('Payment cannot exceed outstanding balance.', 400, 'VALIDATION_ERROR');

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        schoolId,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        amount,
        mode: payload.mode,
        paidAt: new Date(payload.paidAt),
        receiptRef: payload.receiptRef ? trim(payload.receiptRef) : null,
        recordedByUserId: userId || null,
      },
    });

    // Recalc using "invoice.payments + new payment"
    const next = computeInvoiceState({
      invoice,
      items: invoice.items,
      payments: [...invoice.payments, payment],
    });

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: next.paid,
        status: next.status,
      },
    });

    return { payment, updatedInvoice, computed: next };
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'payment',
    entityId: result.payment.id,
    action: 'created',
    message: `Payment recorded for invoice ${invoice.id} (${amount})`,
  });

  return {
    payment: result.payment,
    invoice: { id: invoice.id, ...result.computed },
  };
}

export async function waiveInvoice({ schoolId, userId, id, amount }) {
  const invoice = await prisma.invoice.findFirst({
    where: { schoolId, id, isArchived: false },
    include: { items: true, payments: true },
  });
  if (!invoice) throw new AppError('Invoice not found.', 404, 'NOT_FOUND');

  const computed = computeInvoiceState({ invoice, items: invoice.items, payments: invoice.payments });
  const waiveAmount = Math.min(Number(amount || 0), computed.balance);

  if (waiveAmount <= 0) throw new AppError('Waive amount must be positive.', 400, 'VALIDATION_ERROR');

  const nextInvoice = await prisma.$transaction(async (tx) => {
    const updated = await tx.invoice.update({
      where: { id },
      data: {
        waivedAmount: Number(invoice.waivedAmount || 0) + waiveAmount,
      },
    });

    const next = computeInvoiceState({
      invoice: updated,
      items: invoice.items,
      payments: invoice.payments,
    });

    await tx.invoice.update({
      where: { id },
      data: {
        status: next.status,
      },
    });

    return { updated, next };
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'invoice',
    entityId: id,
    action: 'waived',
    message: `Invoice waived by ${waiveAmount}`,
  });

  return { id, ...nextInvoice.next };
}

/** Payments history **/
export async function listPayments({ schoolId, query }) {
  const { page, pageSize, skip, take } = parsePagination(query);

  const search = trim(query.search || '');

  const where = {
    schoolId,
    isArchived: false,
  };

  if (search) {
    where.OR = [
      { receiptRef: { contains: search, mode: 'insensitive' } },
      { invoiceId: { contains: search, mode: 'insensitive' } },
      { student: { fullName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [totalItems, items] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      skip,
      take,
      include: {
        student: { select: { id: true, fullName: true } },
        invoice: { select: { id: true, invoiceNo: true } },

      },
    }),
  ]);

  return { items, meta: buildPageMeta({ page, pageSize, totalItems }) };
}