import { z } from 'zod';

export const updateMeSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  nextPassword: z.string().min(8).max(200),
});

export const adminCreateUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  username: z.string().min(3).max(40),
  password: z.string().min(8).max(200),
  role: z.enum(['Admin', 'Principal', 'Teacher', 'Accountant', 'Librarian', 'Parent', 'Student']),
});

export const linkStudentSchema = z.object({
  studentId: z.string().uuid(),
  role: z.enum(['Parent', 'Student']),
});