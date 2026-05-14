import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { trim } from '../../shared/utils/ids.js';
import { writeAuditLog } from '../audit/audit.service.js';

async function vehicleOccupancy({ schoolId, vehicleId, excludeAssignmentId = null }) {
  return prisma.transportAssignment.count({
    where: {
      schoolId,
      vehicleId,
      isArchived: false,
      active: true,
      ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
    },
  });
}

async function ensureRouteStop({ schoolId, routeId, pickupStop }) {
  const route = await prisma.route.findFirst({
    where: { schoolId, id: routeId, isArchived: false },
    select: { id: true, stops: true },
  });

  if (!route) throw new AppError('Route not found.', 400, 'VALIDATION_ERROR', { field: 'routeId' });

  const stops = Array.isArray(route.stops) ? route.stops : [];
  if (pickupStop && stops.length && !stops.includes(pickupStop)) {
    throw new AppError('Pickup stop must be one of the route stops.', 400, 'VALIDATION_ERROR', { field: 'pickupStop' });
  }

  return route;
}

async function ensureVehicleCapacity({ schoolId, vehicleId, active, excludeAssignmentId = null }) {
  if (!active) return true;

  const vehicle = await prisma.vehicle.findFirst({
    where: { schoolId, id: vehicleId, isArchived: false },
    select: { id: true, capacity: true },
  });

  if (!vehicle) throw new AppError('Vehicle not found.', 400, 'VALIDATION_ERROR', { field: 'vehicleId' });

  const count = await vehicleOccupancy({ schoolId, vehicleId, excludeAssignmentId });
  if (count >= Number(vehicle.capacity || 0)) {
    throw new AppError('Vehicle capacity reached.', 400, 'VALIDATION_ERROR', { field: 'vehicleId' });
  }

  return true;
}

async function ensureOneActiveAssignmentPerStudent({ schoolId, studentId, active, excludeAssignmentId = null }) {
  if (!active) return true;

  const existing = await prisma.transportAssignment.findFirst({
    where: {
      schoolId,
      studentId,
      isArchived: false,
      active: true,
      ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError('Student already has an active transport assignment.', 400, 'VALIDATION_ERROR', { field: 'studentId' });
  }

  return true;
}

/** ROUTES **/
export async function listRoutes({ schoolId }) {
  const routes = await prisma.route.findMany({
    where: { schoolId, isArchived: false },
    orderBy: { createdAt: 'desc' },
  });
  return routes;
}

export async function createRoute({ schoolId, userId, payload }) {
  const created = await prisma.route.create({
    data: {
      schoolId,
      name: trim(payload.name),
      startPoint: trim(payload.startPoint),
      stops: payload.stops || [],
      distanceKm: Number(payload.distanceKm || 0),
      assignedVehicleId: payload.assignedVehicleId || null,
      status: payload.status || 'active',
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'route',
    entityId: created.id,
    action: 'created',
    message: `Route created: ${created.name}`,
  });

  return created;
}

export async function updateRoute({ schoolId, userId, id, payload }) {
  const existing = await prisma.route.findFirst({ where: { schoolId, id } });
  if (!existing) throw new AppError('Route not found.', 404, 'NOT_FOUND');

  const updated = await prisma.route.update({
    where: { id },
    data: {
      name: payload.name != null ? trim(payload.name) : undefined,
      startPoint: payload.startPoint != null ? trim(payload.startPoint) : undefined,
      stops: payload.stops != null ? payload.stops : undefined,
      distanceKm: payload.distanceKm != null ? Number(payload.distanceKm) : undefined,
      assignedVehicleId: payload.assignedVehicleId !== undefined ? payload.assignedVehicleId : undefined,
      status: payload.status != null ? payload.status : undefined,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'route',
    entityId: id,
    action: 'updated',
    message: `Route updated: ${updated.name}`,
  });

  return updated;
}

export async function archiveRoute({ schoolId, userId, id }) {
  const existing = await prisma.route.findFirst({ where: { schoolId, id } });
  if (!existing) throw new AppError('Route not found.', 404, 'NOT_FOUND');

  const updated = await prisma.route.update({
    where: { id },
    data: { isArchived: true, status: 'archived' },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'route',
    entityId: id,
    action: 'archived',
    message: `Route archived: ${existing.name}`,
  });

  return updated;
}

/** VEHICLES **/
export async function listVehicles({ schoolId }) {
  const vehicles = await prisma.vehicle.findMany({
    where: { schoolId, isArchived: false },
    orderBy: { createdAt: 'desc' },
  });

  // Attach occupancy (active assignments)
  const counts = await prisma.transportAssignment.groupBy({
    by: ['vehicleId'],
    where: { schoolId, isArchived: false, active: true },
    _count: { _all: true },
  });

  const map = new Map(counts.map((c) => [c.vehicleId, c._count._all]));

  return vehicles.map((v) => ({
    ...v,
    occupancy: map.get(v.id) || 0,
  }));
}

export async function createVehicle({ schoolId, userId, payload }) {
  const plateNo = trim(payload.plateNo);

  const dup = await prisma.vehicle.findFirst({
    where: { schoolId, plateNo, isArchived: false },
    select: { id: true },
  });
  if (dup) throw new AppError('Plate number already exists.', 409, 'CONFLICT', { field: 'plateNo' });

  const created = await prisma.vehicle.create({
    data: {
      schoolId,
      name: trim(payload.name),
      plateNo,
      capacity: Number(payload.capacity),
      status: payload.status || 'active',
      driverName: payload.driverName ? trim(payload.driverName) : null,
      routeId: payload.routeId || null,
      health: payload.health ? trim(payload.health) : null,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'vehicle',
    entityId: created.id,
    action: 'created',
    message: `Vehicle created: ${created.name}`,
  });

  return created;
}

export async function updateVehicle({ schoolId, userId, id, payload }) {
  const existing = await prisma.vehicle.findFirst({ where: { schoolId, id } });
  if (!existing) throw new AppError('Vehicle not found.', 404, 'NOT_FOUND');

  if (payload.plateNo) {
    const plateNo = trim(payload.plateNo);
    const dup = await prisma.vehicle.findFirst({
      where: { schoolId, plateNo, isArchived: false, id: { not: id } },
      select: { id: true },
    });
    if (dup) throw new AppError('Plate number already exists.', 409, 'CONFLICT', { field: 'plateNo' });
  }

  const updated = await prisma.vehicle.update({
    where: { id },
    data: {
      name: payload.name != null ? trim(payload.name) : undefined,
      plateNo: payload.plateNo != null ? trim(payload.plateNo) : undefined,
      capacity: payload.capacity != null ? Number(payload.capacity) : undefined,
      status: payload.status != null ? payload.status : undefined,
      driverName: payload.driverName != null ? (payload.driverName ? trim(payload.driverName) : null) : undefined,
      routeId: payload.routeId !== undefined ? payload.routeId : undefined,
      health: payload.health != null ? (payload.health ? trim(payload.health) : null) : undefined,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'vehicle',
    entityId: id,
    action: 'updated',
    message: `Vehicle updated: ${updated.name}`,
  });

  return updated;
}

export async function archiveVehicle({ schoolId, userId, id }) {
  const existing = await prisma.vehicle.findFirst({ where: { schoolId, id } });
  if (!existing) throw new AppError('Vehicle not found.', 404, 'NOT_FOUND');

  const updated = await prisma.vehicle.update({
    where: { id },
    data: { isArchived: true, status: 'archived' },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'vehicle',
    entityId: id,
    action: 'archived',
    message: `Vehicle archived: ${existing.name}`,
  });

  return updated;
}

export async function listAssignments({ schoolId }) {
  return prisma.transportAssignment.findMany({
    where: { schoolId, isArchived: false },
    orderBy: { createdAt: 'desc' },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
        },
      },
      route: { select: { id: true, name: true } },
      vehicle: { select: { id: true, name: true, plateNo: true, capacity: true } },
    },
  });
}

export async function createAssignment({ schoolId, userId, payload }) {
  const student = await prisma.student.findFirst({
    where: { schoolId, id: payload.studentId, isArchived: false },
    select: { id: true, fullName: true },
  });
  if (!student) throw new AppError('Student not found.', 400, 'VALIDATION_ERROR', { field: 'studentId' });

  await ensureRouteStop({ schoolId, routeId: payload.routeId, pickupStop: payload.pickupStop });
  await ensureVehicleCapacity({ schoolId, vehicleId: payload.vehicleId, active: payload.active !== false });
  await ensureOneActiveAssignmentPerStudent({ schoolId, studentId: payload.studentId, active: payload.active !== false });

  const created = await prisma.transportAssignment.create({
    data: {
      schoolId,
      studentId: payload.studentId,
      routeId: payload.routeId,
      vehicleId: payload.vehicleId,
      pickupStop: trim(payload.pickupStop),
      dropStop: payload.dropStop ? trim(payload.dropStop) : null,
      active: payload.active !== false,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'transportAssignment',
    entityId: created.id,
    action: 'created',
    message: `Transport assignment created for ${student.fullName}`,
  });

  return created;
}

export async function updateAssignment({ schoolId, userId, id, payload }) {
  const existing = await prisma.transportAssignment.findFirst({
    where: { schoolId, id, isArchived: false },
  });
  if (!existing) throw new AppError('Assignment not found.', 404, 'NOT_FOUND');

  const merged = {
    studentId: payload.studentId ?? existing.studentId,
    routeId: payload.routeId ?? existing.routeId,
    vehicleId: payload.vehicleId ?? existing.vehicleId,
    pickupStop: payload.pickupStop ?? existing.pickupStop,
    dropStop: payload.dropStop !== undefined ? payload.dropStop : existing.dropStop,
    active: payload.active !== undefined ? Boolean(payload.active) : existing.active,
  };

  const student = await prisma.student.findFirst({
    where: { schoolId, id: merged.studentId, isArchived: false },
    select: { id: true, fullName: true },
  });
  if (!student) throw new AppError('Student not found.', 400, 'VALIDATION_ERROR', { field: 'studentId' });

  await ensureRouteStop({ schoolId, routeId: merged.routeId, pickupStop: merged.pickupStop });
  await ensureVehicleCapacity({ schoolId, vehicleId: merged.vehicleId, active: merged.active, excludeAssignmentId: id });
  await ensureOneActiveAssignmentPerStudent({ schoolId, studentId: merged.studentId, active: merged.active, excludeAssignmentId: id });

  const updated = await prisma.transportAssignment.update({
    where: { id },
    data: {
      studentId: merged.studentId,
      routeId: merged.routeId,
      vehicleId: merged.vehicleId,
      pickupStop: trim(merged.pickupStop),
      dropStop: merged.dropStop ? trim(merged.dropStop) : null,
      active: merged.active,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'transportAssignment',
    entityId: id,
    action: 'updated',
    message: `Transport assignment updated for ${student.fullName}`,
  });

  return updated;
}

export async function setAssignmentActive({ schoolId, userId, id, active }) {
  const existing = await prisma.transportAssignment.findFirst({
    where: { schoolId, id, isArchived: false },
  });
  if (!existing) throw new AppError('Assignment not found.', 404, 'NOT_FOUND');

  // If activating, enforce rules again
  if (active) {
    await ensureVehicleCapacity({ schoolId, vehicleId: existing.vehicleId, active: true, excludeAssignmentId: id });
    await ensureOneActiveAssignmentPerStudent({ schoolId, studentId: existing.studentId, active: true, excludeAssignmentId: id });
  }

  const updated = await prisma.transportAssignment.update({
    where: { id },
    data: { active: Boolean(active) },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'transportAssignment',
    entityId: id,
    action: active ? 'activated' : 'deactivated',
    message: `Transport assignment ${active ? 'activated' : 'deactivated'}`,
  });

  return updated;
}

export async function archiveAssignment({ schoolId, userId, id }) {
  const existing = await prisma.transportAssignment.findFirst({
    where: { schoolId, id, isArchived: false },
  });
  if (!existing) throw new AppError('Assignment not found.', 404, 'NOT_FOUND');

  const updated = await prisma.transportAssignment.update({
    where: { id },
    data: { isArchived: true, active: false },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'transportAssignment',
    entityId: id,
    action: 'archived',
    message: `Transport assignment archived`,
  });

  return updated;
}