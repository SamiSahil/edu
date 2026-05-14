import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { writeAuditLog } from '../audit/audit.service.js';
import { getTeacherScope } from '../../shared/scopes/teacherScope.js';

function isStudentLike(role) {
  return role === 'Student' || role === 'Parent';
}

async function getLinkedStudentIds({ schoolId, userId }) {
  const links = await prisma.studentLink.findMany({
    where: { schoolId, userId },
    select: { studentId: true },
  });
  return links.map((l) => l.studentId);
}

export async function getAttendanceForDateSection({ schoolId, role, userId, date, sectionId }) {
  if (role === 'Teacher') {
    const scope = await getTeacherScope({ schoolId, userId });
    if (!scope.sectionIds.includes(sectionId)) {
      throw new AppError('You do not have access to this section.', 403, 'FORBIDDEN');
    }
  }

  if (isStudentLike(role)) {
    const linkedIds = await getLinkedStudentIds({ schoolId, userId });
    if (!linkedIds.length) return [];

    return prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        sectionId,
        date,
        isArchived: false,
        studentId: { in: linkedIds },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  return prisma.attendanceRecord.findMany({
    where: { schoolId, sectionId, date, isArchived: false },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markAttendanceBatch({ schoolId, userId, role, records }) {
  if (isStudentLike(role)) {
    throw new AppError('You do not have permission to mark attendance.', 403, 'FORBIDDEN');
  }

  if (role === 'Teacher') {
    const scope = await getTeacherScope({ schoolId, userId });
    const batchSectionIds = new Set(records.map((r) => r.sectionId));
    for (const sid of batchSectionIds) {
      if (!scope.sectionIds.includes(sid)) {
        throw new AppError('You do not have access to mark this section.', 403, 'FORBIDDEN', { sectionId: sid });
      }
    }
  }

  const sectionIds = Array.from(new Set(records.map((r) => r.sectionId)));
  const studentIds = Array.from(new Set(records.map((r) => r.studentId)));

  const [sections, students] = await Promise.all([
    prisma.section.findMany({
      where: { schoolId, id: { in: sectionIds }, isArchived: false },
      select: { id: true },
    }),
    prisma.student.findMany({
      where: { schoolId, id: { in: studentIds }, isArchived: false },
      select: { id: true },
    }),
  ]);

  const sectionSet = new Set(sections.map((s) => s.id));
  const studentSet = new Set(students.map((s) => s.id));

  for (const r of records) {
    if (!sectionSet.has(r.sectionId)) {
      throw new AppError('Invalid section in batch.', 400, 'VALIDATION_ERROR', { sectionId: r.sectionId });
    }
    if (!studentSet.has(r.studentId)) {
      throw new AppError('Invalid student in batch.', 400, 'VALIDATION_ERROR', { studentId: r.studentId });
    }
  }

  let createdCount = 0;
  let updatedCount = 0;

  const results = await prisma.$transaction(async (tx) => {
    const out = [];

    for (const rec of records) {
      const data = {
        schoolId,
        studentId: rec.studentId,
        sectionId: rec.sectionId,
        date: rec.date,
        status: rec.status,
        note: rec.note ? String(rec.note) : null,
        markedByUserId: userId,
        updatedAt: new Date(),
      };

      const upserted = await tx.attendanceRecord.upsert({
        where: {
          schoolId_studentId_sectionId_date: {
            schoolId,
            studentId: rec.studentId,
            sectionId: rec.sectionId,
            date: rec.date,
          },
        },
        create: {
          ...data,
          createdAt: new Date(),
          isArchived: false,
        },
        update: data,
      });

      if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) createdCount += 1;
      else updatedCount += 1;

      out.push(upserted);
    }

    return out;
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'attendance',
    entityId: `${records[0].sectionId}:${records[0].date}`,
    action: 'marked',
    message: `Attendance batch marked for section ${records[0].sectionId} on ${records[0].date} (${records.length} records)`,
  });

  return { items: results, createdCount, updatedCount };
}

export async function getAttendanceMonthReport({ schoolId, role, userId, month }) {
  const where = {
    schoolId,
    isArchived: false,
    date: { startsWith: `${month}-` },
  };

  if (role === 'Teacher') {
    const scope = await getTeacherScope({ schoolId, userId });
    where.sectionId = { in: scope.sectionIds.length ? scope.sectionIds : ['__none__'] };
  }

  if (isStudentLike(role)) {
    const linkedIds = await getLinkedStudentIds({ schoolId, userId });
    where.studentId = { in: linkedIds.length ? linkedIds : ['__none__'] };
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
        },
      },
      section: { select: { id: true, name: true, classId: true } },
    },
  });

  const counts = { present: 0, absent: 0, late: 0, half_day: 0, excused: 0 };
  for (const r of records) if (counts[r.status] != null) counts[r.status] += 1;

  const total = records.length || 1;
  const presentLike = counts.present + counts.late;
  const attendanceRate = Math.round((presentLike / total) * 100);

  const absentees = records.filter((r) => r.status === 'absent');

  return { month, records, counts, attendanceRate, absentees };
}