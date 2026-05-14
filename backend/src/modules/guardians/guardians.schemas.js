import { z } from 'zod';

export const createGuardianSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(25),
  email: z.string().email().optional().or(z.literal('')),
  relation: z.string().optional().or(z.literal('')),
});

export const updateGuardianSchema = createGuardianSchema.partial();