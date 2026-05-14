import { z } from 'zod';

export const selectSchoolSchema = z.object({
  schoolId: z.string().uuid(),
});