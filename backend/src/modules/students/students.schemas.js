import { z } from 'zod';

const dateString = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), {
  message: 'Invalid date',
});

const admissionNoCreate = z
  .string()
  .max(40)
  .optional()
  .or(z.literal(''))
  .refine((v) => v === '' || v.length >= 2, {
    message: 'Admission number must be at least 2 characters (or leave blank to auto-generate).',
  });

export const createStudentSchema = z.object({
  fullName: z.string().min(2).max(80),
  admissionNo: admissionNoCreate,

  dob: dateString,
  gender: z.enum(['male', 'female', 'other']),

  classId: z.string().uuid(),
  sectionId: z.string().uuid(),

  guardianId: z.string().uuid().optional(),

  guardianName: z.string().min(2).max(120),
  guardianPhone: z.string().min(7).max(25),
  guardianEmail: z.string().email().optional().or(z.literal('')),
  guardianRelation: z.string().max(60).optional().or(z.literal('')),

  admissionDate: dateString,
  admissionYear: z.number().int().min(2000).max(2100),

  phone: z.string().min(7).max(25),
  email: z.string().email().optional().or(z.literal('')),

  status: z.enum(['active', 'inactive', 'transferred', 'promoted', 'archived']).optional(),
  notes: z.string().optional().or(z.literal('')),
  documents: z.string().optional().or(z.literal('')),

  avatarFileId: z.string().uuid().optional().nullable(),

  // ✅ Create student login
  createStudentLogin: z.boolean().optional().default(false),
  studentLoginEmail: z.string().email().optional().or(z.literal('')),
  studentLoginPassword: z.string().min(8).max(200).optional().or(z.literal('')),

  // ✅ Create parent login
  createParentLogin: z.boolean().optional().default(false),
  parentLoginEmail: z.string().email().optional().or(z.literal('')),
  parentLoginPassword: z.string().min(8).max(200).optional().or(z.literal('')),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  fullName: z.string().min(2).max(80).optional(),
  admissionNo: z.string().min(2).max(40).optional(),
});

export const transferSchema = z.object({
  reason: z.string().min(2).max(500).default('Transferred'),
});

export const promoteSchema = z.object({
  nextClassId: z.string().uuid().optional(),
  nextSectionId: z.string().uuid().optional(),
});