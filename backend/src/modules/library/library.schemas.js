import { z } from 'zod';

const uuid = () => z.string().uuid();

const dateString = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), {
  message: 'Invalid date',
});

export const createBookSchema = z.object({
  title: z.string().min(2).max(200),
  author: z.string().min(2).max(120),
  isbn: z.string().min(5).max(32),
  category: z.string().min(2).max(80),
  copies: z.number().int().min(1).max(10000),
  status: z.enum(['available', 'issued', 'reserved', 'lost']).optional(),
});

export const issueBookSchema = z.object({
  bookId: uuid(),
  studentId: uuid(),
  issuedAt: dateString,
  dueDate: dateString,
});

export const returnBookSchema = z.object({
  returnedAt: dateString.optional(),
});