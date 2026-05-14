import { z } from 'zod';

const dateString = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), {
  message: 'Invalid date',
});

export const createStaffSchema = z.object({
  name: z.string().min(2).max(120),
  roleLabel: z.enum(['Teacher', 'Principal', 'Accountant', 'Librarian', 'Admin']),
  department: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(25),
  joinDate: dateString,
  status: z.enum(['active', 'inactive', 'archived']).optional(),

  createLogin: z.boolean().optional().default(false),
  loginPassword: z.string().min(8).max(200).optional().or(z.literal('')),
});

export const updateStaffSchema = createStaffSchema.partial();