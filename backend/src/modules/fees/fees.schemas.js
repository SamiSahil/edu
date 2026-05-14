import { z } from 'zod';

const uuid = () => z.string().uuid();

const dateString = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), {
  message: 'Invalid date',
});

const feeHeadSchema = z.object({
  label: z.string().min(1).max(80),
  amount: z.number().int().min(0).max(1_000_000),
});

const invoiceItemSchema = z.object({
  label: z.string().min(1).max(80),
  amount: z.number().int().min(0).max(1_000_000),
});

export const createFeeStructureSchema = z.object({
  name: z.string().min(2).max(160),
  classId: uuid(),
  period: z.enum(['monthly', 'annual']),
  active: z.boolean().optional(),
  feeHeads: z.array(feeHeadSchema).optional().default([]),
});

export const updateFeeStructureSchema = createFeeStructureSchema.partial();

export const createInvoiceSchema = z.object({
  studentId: uuid(),
  issuedAt: dateString,
  dueDate: dateString,
  items: z.array(invoiceItemSchema).min(1, 'Add at least one invoice item.'),
  notes: z.string().optional().or(z.literal('')),
});

export const recordPaymentSchema = z.object({
  invoiceId: uuid(),
  studentId: uuid(),
  amount: z.number().int().min(1),
  paidAt: dateString,
  mode: z.enum(['cash', 'card', 'bank']),
  receiptRef: z.string().max(80).optional().or(z.literal('')),
});

export const waiveInvoiceSchema = z.object({
  amount: z.number().int().min(1),
});