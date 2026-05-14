import { z } from 'zod';

const uuid = () => z.string().uuid();

export const createClassSchema = z.object({
  name: z.string().min(2).max(80),
  code: z.string().min(2).max(12),
  order: z.number().int().min(1).max(1000),
  classTeacherStaffId: uuid().optional().nullable(),
});

export const updateClassSchema = createClassSchema.partial();

export const createSectionSchema = z.object({
  classId: uuid(),
  name: z.string().min(1).max(20),
  capacity: z.number().int().min(1).max(500),
});

export const updateSectionSchema = createSectionSchema.partial();

export const createSubjectSchema = z.object({
  name: z.string().min(2).max(80),
  code: z.string().min(2).max(12),
  type: z.enum(['core', 'elective']),
  teacherStaffId: uuid(),
  classIds: z.array(uuid()).optional(), // optional mapping
});

export const updateSubjectSchema = createSubjectSchema.partial();

export const timetableQuerySchema = z.object({
  classId: uuid().optional(),
  sectionId: uuid().optional(),
});

export const createTimetableEntrySchema = z.object({
  classId: uuid(),
  sectionId: uuid(),
  day: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
  period: z.number().int().min(1).max(20),
  subjectId: uuid(),
  teacherStaffId: uuid(),
  room: z.string().max(30).optional().or(z.literal('')),
});

export const updateTimetableEntrySchema = createTimetableEntrySchema.partial();