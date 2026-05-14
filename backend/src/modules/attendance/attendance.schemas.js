import { z } from 'zod';

const uuid = () => z.string().uuid();

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const monthKey = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM');

export const getForDateSchema = z.object({
  date: ymd,
  sectionId: uuid(),
});

export const markBatchSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: uuid(),
        sectionId: uuid(),
        date: ymd,
        status: z.enum(['present', 'absent', 'late', 'half_day', 'excused']),
        note: z.string().max(500).optional().or(z.literal('')),
        // optional from frontend; not stored but tolerated
        classId: uuid().optional(),
      })
    )
    .min(1, 'At least one record is required.'),
});

export const reportSchema = z.object({
  month: monthKey,
});