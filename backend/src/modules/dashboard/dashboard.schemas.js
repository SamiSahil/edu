import { z } from 'zod';

export const dashboardSummaryQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM')
    .optional(),
});