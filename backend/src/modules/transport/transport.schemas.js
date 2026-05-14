import { z } from 'zod';

const uuid = () => z.string().uuid();

export const createRouteSchema = z.object({
  name: z.string().min(2).max(120),
  startPoint: z.string().min(1).max(120),
  stops: z.array(z.string().min(1).max(80)).optional().default([]),
  distanceKm: z.number().int().min(0).max(10000).optional().default(0),
  assignedVehicleId: uuid().optional().nullable(),
  status: z.enum(['active', 'maintenance', 'retired']).default('active'),
});

export const updateRouteSchema = createRouteSchema.partial();

export const createVehicleSchema = z.object({
  name: z.string().min(2).max(120),
  plateNo: z.string().min(2).max(40),
  capacity: z.number().int().min(1).max(200),
  status: z.enum(['active', 'maintenance', 'retired']).default('active'),
  driverName: z.string().optional().or(z.literal('')),
  routeId: uuid().optional().nullable(),
  health: z.string().optional().or(z.literal('')),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const createAssignmentSchema = z.object({
  studentId: uuid(),
  routeId: uuid(),
  vehicleId: uuid(),
  pickupStop: z.string().min(1).max(80),
  dropStop: z.string().max(80).optional().or(z.literal('')),
  active: z.boolean().optional().default(true),
});

export const updateAssignmentSchema = createAssignmentSchema.partial();

export const toggleAssignmentSchema = z.object({
  active: z.boolean(),
});