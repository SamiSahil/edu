import { z } from 'zod';

export const reportsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  classId: z.string().uuid().optional().or(z.literal('')),
  sectionId: z.string().uuid().optional().or(z.literal('')),
  role: z.enum(['Teacher', 'Accountant', 'Librarian', 'Parent', 'Student']).optional().or(z.literal('')),
  category: z.enum(['attendance', 'fees', 'students', 'staff']).optional().or(z.literal('')),
});