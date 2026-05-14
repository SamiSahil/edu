import { z } from 'zod';

export const signatureSchema = z.object({
  resourceType: z.enum(['image', 'raw', 'auto']).default('auto'),
  entityType: z.string().min(1).max(60).optional(),
  entityId: z.string().min(1).max(120).optional(),
  tags: z.array(z.string()).optional(),
});

export const confirmSchema = z.object({
  cloudinaryPublicId: z.string().min(1),
  secureUrl: z.string().url(),
  resourceType: z.string().min(1), 
  format: z.string().optional(),
  bytes: z.number().int().optional(),
  originalFilename: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});