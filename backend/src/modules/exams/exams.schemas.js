import { z } from 'zod';

const uuid = () => z.string().uuid();

const dateString = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), {
  message: 'Invalid date',
});

export const createExamSchema = z.object({
  name: z.string().min(2).max(80),
  term: z.string().min(1).max(80),
  classId: uuid(),
  scheduledFor: dateString,
  maxMarks: z.number().int().min(1).max(1000).default(100),
  status: z.enum(['draft', 'scheduled', 'ongoing', 'published', 'locked']).default('draft'),
  subjectIds: z.array(uuid()).optional().default([]),
});

export const updateExamSchema = createExamSchema.partial();

export const upsertMarkSchema = z.object({
  examId: uuid(),
  studentId: uuid(),
  subjectId: uuid(),
  marks: z.number().int().min(0).max(1000),
  grade: z.string().optional().or(z.literal('')),
  remarks: z.string().optional().or(z.literal('')),
});

export const upsertMarksBatchSchema = z.object({
  entries: z.array(upsertMarkSchema).min(1),
});