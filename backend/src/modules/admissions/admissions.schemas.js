import { z } from 'zod';

export const createAdmissionSchema = z.object({
  applicantName: z.string().min(2).max(80),
  parentName: z.string().min(2).max(80),
  phone: z.string().min(7).max(25),
  email: z.string().email(),
  requestedClassId: z.string().uuid(),
  source: z.string().min(1).max(80),
  previousSchool: z.string().optional().or(z.literal('')),
  status: z.enum(['new', 'contacted', 'shortlisted', 'approved', 'rejected', 'converted']).optional(),
  notes: z.string().optional().or(z.literal('')),
});

export const updateAdmissionSchema = createAdmissionSchema.partial();

export const convertAdmissionSchema = z.object({
  // Optional overrides
  dob: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  sectionId: z.string().uuid().optional(),
  guardianId: z.string().uuid().optional(),
});