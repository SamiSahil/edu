import { z } from 'zod';

export const loginSchema = z.object({
  identity: z.string().min(1, 'Email or username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  username: z.string().min(3).max(40),
  password: z.string().min(8).max(200),
  schoolName: z.string().min(2).max(160),
});

export const forgotPasswordSchema = z.object({
  identity: z.string().min(1, 'Email or username is required.'),
});