import { z } from 'zod';

const uuid = () => z.string().uuid();

const dateString = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), {
  message: 'Invalid date',
});

export const createAssignmentSchema = z.object({
  title: z.string().min(2).max(120),
  classId: uuid(),
  sectionId: uuid(),
  subjectId: uuid(),
  dueDate: dateString,
  instructions: z.string().min(5).max(5000),
  status: z.enum(['draft', 'published', 'closed']).default('draft'),
});

export const updateAssignmentSchema = createAssignmentSchema.partial();

export const archiveAssignmentSchema = z.object({
  reason: z.string().max(200).optional().or(z.literal('')),
});