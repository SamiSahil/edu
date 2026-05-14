import { z } from 'zod';

export const updateSchoolSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(7).max(25).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  motto: z.string().max(160).optional().or(z.literal('')),
});