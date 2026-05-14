import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { lower, trim } from '../../shared/utils/ids.js';
import { writeAuditLog } from '../audit/audit.service.js';
import { getTeacherScope } from '../../shared/scopes/teacherScope.js';


function isStudentLike(role) {
  return role === 'Student' || role === 'Parent';
}

async function getLinkedPairs({ schoolId, userId }) {
  const links = await prisma.studentLink.findMany({
    where: { schoolId, userId },
    select: { studentId: true },
  });

  if (!links.length) return [];

  const students = await prisma.student.findMany({
    where: { schoolId, id: { in: links.map((l) => l.studentId) }, isArchived: false },
    select: { classId: true, sectionId: true },
  });

  const seen = new Set();
  const pairs = [];
  for (const s of students) {
    const key = `${s.classId}::${s.sectionId}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ classId: s.classId, sectionId: s.sectionId });
    }
  }
  return pairs;
}

export async function getClassesSections({ schoolId }) {
  const [classes, sections, staff] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId, isArchived: false },
      orderBy: { order: 'asc' },
      include: {
        classTeacher: { select: { id: true, name: true, roleLabel: true } },
      },
    }),
    prisma.section.findMany({
      where: { schoolId, isArchived: false },
      orderBy: [{ classId: 'asc' }, { name: 'asc' }],
    }),
    prisma.staff.findMany({
      where: { schoolId, isArchived: false, status: 'active' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, roleLabel: true, department: true },
    }),
  ]);

  return { classes, sections, staff };
}

export async function createClass({ schoolId, userId, payload }) {
  const code = trim(payload.code);
  const dup = await prisma.class.findFirst({
    where: { schoolId, code, isArchived: false },
    select: { id: true },
  });
  if (dup) throw new AppError('Class code already exists.', 409, 'CONFLICT', { field: 'code' });

  const created = await prisma.class.create({
    data: {
      schoolId,
      name: trim(payload.name),
      code,
      order: Number(payload.order),
      classTeacherStaffId: payload.classTeacherStaffId || null,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'class',
    entityId: created.id,
    action: 'created',
    message: `Class created: ${created.name}`,
  });

  return created;
}

export async function updateClass({ schoolId, userId, id, payload }) {
  const existing = await prisma.class.findFirst({ where: { id, schoolId } });
  if (!existing) throw new AppError('Class not found.', 404, 'NOT_FOUND');

  if (payload.code) {
    const code = trim(payload.code);
    const dup = await prisma.class.findFirst({
      where: { schoolId, code, isArchived: false, id: { not: id } },
      select: { id: true },
    });
    if (dup) throw new AppError('Class code already exists.', 409, 'CONFLICT', { field: 'code' });
  }

  const updated = await prisma.class.update({
    where: { id },
    data: {
      name: payload.name != null ? trim(payload.name) : undefined,
      code: payload.code != null ? trim(payload.code) : undefined,
      order: payload.order != null ? Number(payload.order) : undefined,
      classTeacherStaffId: payload.classTeacherStaffId !== undefined ? payload.classTeacherStaffId : undefined,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'class',
    entityId: id,
    action: 'updated',
    message: `Class updated: ${updated.name}`,
  });

  return updated;
}

export async function archiveClass({ schoolId, userId, id }) {
  const existing = await prisma.class.findFirst({ where: { id, schoolId } });
  if (!existing) throw new AppError('Class not found.', 404, 'NOT_FOUND');

  const updated = await prisma.class.update({
    where: { id },
    data: { isArchived: true },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'class',
    entityId: id,
    action: 'archived',
    message: `Class archived: ${existing.name}`,
  });

  return updated;
}

export async function createSection({ schoolId, userId, payload }) {
  const cls = await prisma.class.findFirst({
    where: { schoolId, id: payload.classId, isArchived: false },
    select: { id: true },
  });
  if (!cls) throw new AppError('Class not found.', 400, 'VALIDATION_ERROR', { field: 'classId' });

  const dup = await prisma.section.findFirst({
    where: { schoolId, classId: payload.classId, name: trim(payload.name), isArchived: false },
    select: { id: true },
  });
  if (dup) throw new AppError('Section already exists for this class.', 409, 'CONFLICT', { field: 'name' });

  const created = await prisma.section.create({
    data: {
      schoolId,
      classId: payload.classId,
      name: trim(payload.name),
      capacity: Number(payload.capacity),
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'section',
    entityId: created.id,
    action: 'created',
    message: `Section created: ${created.name}`,
  });

  return created;
}

export async function updateSection({ schoolId, userId, id, payload }) {
  const existing = await prisma.section.findFirst({ where: { id, schoolId } });
  if (!existing) throw new AppError('Section not found.', 404, 'NOT_FOUND');

  if (payload.classId) {
    const cls = await prisma.class.findFirst({
      where: { schoolId, id: payload.classId, isArchived: false },
      select: { id: true },
    });
    if (!cls) throw new AppError('Class not found.', 400, 'VALIDATION_ERROR', { field: 'classId' });
  }

  if (payload.name || payload.classId) {
    const nextClassId = payload.classId || existing.classId;
    const nextName = payload.name != null ? trim(payload.name) : existing.name;
    const dup = await prisma.section.findFirst({
      where: {
        schoolId,
        classId: nextClassId,
        name: nextName,
        isArchived: false,
        id: { not: id },
      },
      select: { id: true },
    });
    if (dup) throw new AppError('Section already exists for this class.', 409, 'CONFLICT');
  }

  const updated = await prisma.section.update({
    where: { id },
    data: {
      classId: payload.classId != null ? payload.classId : undefined,
      name: payload.name != null ? trim(payload.name) : undefined,
      capacity: payload.capacity != null ? Number(payload.capacity) : undefined,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'section',
    entityId: id,
    action: 'updated',
    message: `Section updated: ${updated.name}`,
  });

  return updated;
}

export async function archiveSection({ schoolId, userId, id }) {
  const existing = await prisma.section.findFirst({ where: { id, schoolId } });
  if (!existing) throw new AppError('Section not found.', 404, 'NOT_FOUND');

  const updated = await prisma.section.update({
    where: { id },
    data: { isArchived: true },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'section',
    entityId: id,
    action: 'archived',
    message: `Section archived: ${existing.name}`,
  });

  return updated;
}

export async function listSubjects({ schoolId }) {
  return prisma.subject.findMany({
    where: { schoolId, isArchived: false },
    orderBy: { createdAt: 'desc' },
    include: {
      teacher: { select: { id: true, name: true, roleLabel: true } },
      classes: { include: { class: { select: { id: true, name: true } } } },
    },
  });
}

export async function createSubject({ schoolId, userId, payload }) {
  const code = trim(payload.code);

  const dup = await prisma.subject.findFirst({
    where: { schoolId, code, isArchived: false },
    select: { id: true },
  });
  if (dup) throw new AppError('Subject code already exists.', 409, 'CONFLICT', { field: 'code' });

  const teacher = await prisma.staff.findFirst({
    where: { schoolId, id: payload.teacherStaffId, isArchived: false },
    select: { id: true },
  });
  if (!teacher) throw new AppError('Teacher not found.', 400, 'VALIDATION_ERROR', { field: 'teacherStaffId' });

  const subject = await prisma.$transaction(async (tx) => {
    const created = await tx.subject.create({
      data: {
        schoolId,
        name: trim(payload.name),
        code,
        type: payload.type,
        teacherStaffId: payload.teacherStaffId,
      },
    });

    if (payload.classIds?.length) {
      const classes = await tx.class.findMany({
        where: { schoolId, id: { in: payload.classIds }, isArchived: false },
        select: { id: true },
      });

      if (classes.length) {
        await tx.subjectOnClass.createMany({
          data: classes.map((c) => ({
            schoolId,
            subjectId: created.id,
            classId: c.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    return created;
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'subject',
    entityId: subject.id,
    action: 'created',
    message: `Subject created: ${subject.name}`,
  });

  return subject;
}

export async function updateSubject({ schoolId, userId, id, payload }) {
  const existing = await prisma.subject.findFirst({ where: { id, schoolId } });
  if (!existing) throw new AppError('Subject not found.', 404, 'NOT_FOUND');

  if (payload.code) {
    const code = trim(payload.code);
    const dup = await prisma.subject.findFirst({
      where: { schoolId, code, isArchived: false, id: { not: id } },
      select: { id: true },
    });
    if (dup) throw new AppError('Subject code already exists.', 409, 'CONFLICT', { field: 'code' });
  }

  if (payload.teacherStaffId) {
    const teacher = await prisma.staff.findFirst({
      where: { schoolId, id: payload.teacherStaffId, isArchived: false },
      select: { id: true },
    });
    if (!teacher) throw new AppError('Teacher not found.', 400, 'VALIDATION_ERROR', { field: 'teacherStaffId' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.subject.update({
      where: { id },
      data: {
        name: payload.name != null ? trim(payload.name) : undefined,
        code: payload.code != null ? trim(payload.code) : undefined,
        type: payload.type != null ? payload.type : undefined,
        teacherStaffId: payload.teacherStaffId != null ? payload.teacherStaffId : undefined,
      },
    });

    if (payload.classIds) {
      await tx.subjectOnClass.deleteMany({ where: { schoolId, subjectId: id } });

      const classes = await tx.class.findMany({
        where: { schoolId, id: { in: payload.classIds }, isArchived: false },
        select: { id: true },
      });

      if (classes.length) {
        await tx.subjectOnClass.createMany({
          data: classes.map((c) => ({ schoolId, subjectId: id, classId: c.id })),
          skipDuplicates: true,
        });
      }
    }

    return s;
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'subject',
    entityId: id,
    action: 'updated',
    message: `Subject updated: ${updated.name}`,
  });

  return updated;
}

export async function archiveSubject({ schoolId, userId, id }) {
  const existing = await prisma.subject.findFirst({ where: { id, schoolId } });
  if (!existing) throw new AppError('Subject not found.', 404, 'NOT_FOUND');

  const updated = await prisma.subject.update({
    where: { id },
    data: { isArchived: true },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'subject',
    entityId: id,
    action: 'archived',
    message: `Subject archived: ${existing.name}`,
  });

  return updated;
}

export async function listTimetable({ schoolId, userId, role, classId, sectionId }) {
  const include = {
    class: { select: { id: true, name: true } },
    section: { select: { id: true, name: true, classId: true } },
    subject: { select: { id: true, name: true, code: true, type: true } },
    teacher: { select: { id: true, name: true, roleLabel: true } },
  };

  // Parent/Student scoping
  if (isStudentLike(role)) {
    const allowed = await getLinkedPairs({ schoolId, userId });
    if (!allowed.length) return [];

    if (classId && sectionId) {
      const ok = allowed.some((p) => p.classId === classId && p.sectionId === sectionId);
      if (!ok) throw new AppError('You do not have access to this timetable.', 403, 'FORBIDDEN');

      return prisma.timetableEntry.findMany({
        where: { schoolId, isArchived: false, classId, sectionId },
        orderBy: [{ day: 'asc' }, { period: 'asc' }],
        include,
      });
    }

    return prisma.timetableEntry.findMany({
      where: {
        schoolId,
        isArchived: false,
        OR: allowed.map((p) => ({ classId: p.classId, sectionId: p.sectionId })),
      },
      orderBy: [{ day: 'asc' }, { period: 'asc' }],
      include,
    });
  }

  // ✅ Teacher scoping
  if (role === 'Teacher') {
    const scope = await getTeacherScope({ schoolId, userId });
    if (!scope.pairs.length) return [];

    if (classId && sectionId) {
      const ok = scope.pairs.some((p) => p.classId === classId && p.sectionId === sectionId);
      if (!ok) throw new AppError('You do not have access to this timetable.', 403, 'FORBIDDEN');

      return prisma.timetableEntry.findMany({
        where: { schoolId, isArchived: false, classId, sectionId },
        orderBy: [{ day: 'asc' }, { period: 'asc' }],
        include,
      });
    }

    return prisma.timetableEntry.findMany({
      where: {
        schoolId,
        isArchived: false,
        OR: scope.pairs.map((p) => ({ classId: p.classId, sectionId: p.sectionId })),
      },
      orderBy: [{ day: 'asc' }, { period: 'asc' }],
      include,
    });
  }

  // Admin/Principal/etc
  const where = {
    schoolId,
    isArchived: false,
    ...(classId ? { classId } : {}),
    ...(sectionId ? { sectionId } : {}),
  };

  return prisma.timetableEntry.findMany({
    where,
    orderBy: [{ day: 'asc' }, { period: 'asc' }],
    include,
  });
}

async function validateTimetableConflicts({ schoolId, payload, excludeId = null }) {
  const slotClash = await prisma.timetableEntry.findFirst({
    where: {
      schoolId,
      isArchived: false,
      id: excludeId ? { not: excludeId } : undefined,
      classId: payload.classId,
      sectionId: payload.sectionId,
      day: payload.day,
      period: payload.period,
    },
    select: { id: true },
  });
  if (slotClash) {
    throw new AppError(
      'This class/section already has a scheduled entry for the selected day and period.',
      400,
      'VALIDATION_ERROR',
      { _form: 'class_slot_conflict' }
    );
  }

  const teacherClash = await prisma.timetableEntry.findFirst({
    where: {
      schoolId,
      isArchived: false,
      id: excludeId ? { not: excludeId } : undefined,
      teacherStaffId: payload.teacherStaffId,
      day: payload.day,
      period: payload.period,
    },
    select: { id: true },
  });
  if (teacherClash) {
    throw new AppError(
      'This teacher is already assigned to another class during the selected day and period.',
      400,
      'VALIDATION_ERROR',
      { _form: 'teacher_slot_conflict' }
    );
  }

  if (payload.room) {
    const room = trim(payload.room);
    const roomClash = await prisma.timetableEntry.findFirst({
      where: {
        schoolId,
        isArchived: false,
        id: excludeId ? { not: excludeId } : undefined,
        day: payload.day,
        period: payload.period,
        room: { equals: room, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (roomClash) {
      throw new AppError(
        'This room is already used for another timetable entry during the selected day and period.',
        400,
        'VALIDATION_ERROR',
        { _form: 'room_slot_conflict' }
      );
    }
  }
}

export async function createTimetableEntry({ schoolId, userId, payload }) {
  const [cls, sec, sub, teacher] = await Promise.all([
    prisma.class.findFirst({ where: { schoolId, id: payload.classId, isArchived: false }, select: { id: true } }),
    prisma.section.findFirst({ where: { schoolId, id: payload.sectionId, isArchived: false }, select: { id: true, classId: true } }),
    prisma.subject.findFirst({ where: { schoolId, id: payload.subjectId, isArchived: false }, select: { id: true } }),
    prisma.staff.findFirst({ where: { schoolId, id: payload.teacherStaffId, isArchived: false }, select: { id: true } }),
  ]);

  if (!cls) throw new AppError('Class not found.', 400, 'VALIDATION_ERROR', { field: 'classId' });
  if (!sec) throw new AppError('Section not found.', 400, 'VALIDATION_ERROR', { field: 'sectionId' });
  if (sec.classId !== payload.classId) throw new AppError('Section does not belong to the selected class.', 400, 'VALIDATION_ERROR');
  if (!sub) throw new AppError('Subject not found.', 400, 'VALIDATION_ERROR', { field: 'subjectId' });
  if (!teacher) throw new AppError('Teacher not found.', 400, 'VALIDATION_ERROR', { field: 'teacherStaffId' });

  const normalized = { ...payload, room: payload.room ? trim(payload.room) : null, period: Number(payload.period) };
  await validateTimetableConflicts({ schoolId, payload: normalized });

  const created = await prisma.timetableEntry.create({
    data: {
      schoolId,
      classId: normalized.classId,
      sectionId: normalized.sectionId,
      day: normalized.day,
      period: normalized.period,
      subjectId: normalized.subjectId,
      teacherStaffId: normalized.teacherStaffId,
      room: normalized.room,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'timetable',
    entityId: created.id,
    action: 'created',
    message: `Timetable entry created (${created.day} P${created.period})`,
  });

  return created;
}

export async function updateTimetableEntry({ schoolId, userId, id, payload }) {
  const existing = await prisma.timetableEntry.findFirst({ where: { id, schoolId } });
  if (!existing) throw new AppError('Timetable entry not found.', 404, 'NOT_FOUND');

  const merged = {
    classId: payload.classId ?? existing.classId,
    sectionId: payload.sectionId ?? existing.sectionId,
    day: payload.day ?? existing.day,
    period: payload.period != null ? Number(payload.period) : existing.period,
    subjectId: payload.subjectId ?? existing.subjectId,
    teacherStaffId: payload.teacherStaffId ?? existing.teacherStaffId,
    room: payload.room !== undefined ? (payload.room ? trim(payload.room) : null) : existing.room,
  };

  const [cls, sec] = await Promise.all([
    prisma.class.findFirst({ where: { schoolId, id: merged.classId, isArchived: false }, select: { id: true } }),
    prisma.section.findFirst({ where: { schoolId, id: merged.sectionId, isArchived: false }, select: { id: true, classId: true } }),
  ]);
  if (!cls) throw new AppError('Class not found.', 400, 'VALIDATION_ERROR', { field: 'classId' });
  if (!sec) throw new AppError('Section not found.', 400, 'VALIDATION_ERROR', { field: 'sectionId' });
  if (sec.classId !== merged.classId) throw new AppError('Section does not belong to the selected class.', 400, 'VALIDATION_ERROR');

  await validateTimetableConflicts({ schoolId, payload: merged, excludeId: id });

  const updated = await prisma.timetableEntry.update({
    where: { id },
    data: merged,
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'timetable',
    entityId: id,
    action: 'updated',
    message: `Timetable entry updated (${updated.day} P${updated.period})`,
  });

  return updated;
}

export async function archiveTimetableEntry({ schoolId, userId, id }) {
  const existing = await prisma.timetableEntry.findFirst({ where: { id, schoolId } });
  if (!existing) throw new AppError('Timetable entry not found.', 404, 'NOT_FOUND');

  const updated = await prisma.timetableEntry.update({
    where: { id },
    data: { isArchived: true },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'timetable',
    entityId: id,
    action: 'archived',
    message: `Timetable entry archived (${existing.day} P${existing.period})`,
  });

  return updated;
}