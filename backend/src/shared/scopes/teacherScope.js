import { prisma } from '../../infra/prisma/client.js';

/**
 * Teacher Scope = the set of class/section/subject the teacher is allowed to operate on.
 * Derived from:
 * - Staff profile for this user (staff.userId)
 * - Timetable entries where teacherStaffId = staff.id
 * - Classes where classTeacherStaffId = staff.id (=> all sections of that class)
 * - Subjects where subject.teacherStaffId = staff.id
 */
export async function getTeacherScope({ schoolId, userId }) {
  const staff = await prisma.staff.findFirst({
    where: { schoolId, userId, isArchived: false },
    select: { id: true },
  });

  if (!staff) {
    return { staffId: null, classIds: [], sectionIds: [], subjectIds: [], pairs: [] };
  }

  const [tt, classTeacherOf, subjectsTaught] = await Promise.all([
    prisma.timetableEntry.findMany({
      where: { schoolId, teacherStaffId: staff.id, isArchived: false },
      select: { classId: true, sectionId: true, subjectId: true },
    }),

    prisma.class.findMany({
      where: { schoolId, classTeacherStaffId: staff.id, isArchived: false },
      select: { id: true },
    }),

    prisma.subject.findMany({
      where: { schoolId, teacherStaffId: staff.id, isArchived: false },
      select: { id: true },
    }),
  ]);

  const classIds = new Set();
  const sectionIds = new Set();
  const subjectIds = new Set(subjectsTaught.map((s) => s.id));
  const pairSet = new Set();

  for (const row of tt) {
    classIds.add(row.classId);
    sectionIds.add(row.sectionId);
    subjectIds.add(row.subjectId);
    pairSet.add(`${row.classId}::${row.sectionId}`);
  }

  // If class teacher: include all sections of that class
  if (classTeacherOf.length) {
    const classIdsArr = classTeacherOf.map((c) => c.id);
    classIdsArr.forEach((id) => classIds.add(id));

    const secs = await prisma.section.findMany({
      where: { schoolId, classId: { in: classIdsArr }, isArchived: false },
      select: { id: true, classId: true },
    });

    for (const s of secs) {
      sectionIds.add(s.id);
      pairSet.add(`${s.classId}::${s.id}`);
    }
  }

  const pairs = Array.from(pairSet).map((k) => {
    const [classId, sectionId] = k.split('::');
    return { classId, sectionId };
  });

  return {
    staffId: staff.id,
    classIds: Array.from(classIds),
    sectionIds: Array.from(sectionIds),
    subjectIds: Array.from(subjectIds),
    pairs,
  };
}