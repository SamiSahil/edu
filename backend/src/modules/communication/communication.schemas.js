import { z } from 'zod';

const uuid = () => z.string().uuid();

export const createCommunicationSchema = z.object({
  kind: z.enum(['message', 'announcement']).default('message'),

  status: z.enum(['draft', 'scheduled', 'sent', 'archived']).default('draft'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),

  subject: z.string().min(2).max(120),
  body: z.string().min(5).max(5000),

  // NEW: "school"
  audienceType: z.enum(['school', 'role', 'class', 'section', 'individual']).default('role'),

  targetRoles: z
    .array(z.enum(['Admin', 'Principal', 'Teacher', 'Accountant', 'Librarian', 'Parent', 'Student']))
    .optional()
    .default([]),

  targetClassIds: z.array(uuid()).optional().default([]),
  targetSectionIds: z.array(uuid()).optional().default([]),
  targetStudentIds: z.array(uuid()).optional().default([]),
});

export const updateCommunicationSchema = createCommunicationSchema.partial();

export const archiveCommunicationSchema = z.object({
  reason: z.string().max(200).optional().or(z.literal('')),
});

export const lookupsQuerySchema = z.object({
  search: z.string().max(80).optional().or(z.literal('')),
});