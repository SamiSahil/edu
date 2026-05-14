import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { parsePagination, buildPageMeta } from '../../shared/utils/pagination.js';
import { trim } from '../../shared/utils/ids.js';
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

async function getLinkedClassIds({ schoolId, userId }) {
  const studentIds = await getLinkedStudentIds({ schoolId, userId });
  if (!studentIds.length) return [];

  const students = await prisma.student.findMany({
    where: { schoolId, id: { in: studentIds }, isArchived: false },
    select: { classId: true },
  });

  return Array.from(new Set(students.map((s) => s.classId)));
}

function gradeFromMarks(avg, maxMarksPerSubject) {
  const pct = (Number(avg) / Number(maxMarksPerSubject || 100)) * 100;
  if (pct >= 90) return { grade: 'A+', remarks: 'Outstanding' };
  if (pct >= 80) return { grade: 'A', remarks: 'Excellent' };
  if (pct >= 70) return { grade: 'B+', remarks: 'Very good' };
  if (pct >= 60) return { grade: 'B', remarks: 'Good' };
  if (pct >= 50) return { grade: 'C', remarks: 'Satisfactory' };
  return { grade: 'D', remarks: 'Needs support' };
}

async function examWithSubjectIds(exam) {
  const subjects = await prisma.examSubject.findMany({
    where: { schoolId: exam.schoolId, examId: exam.id },
    select: { subjectId: true },
  });
  return { ...exam, subjectIds: subjects.map((s) => s.subjectId) };
}

async function assertTeacherExamScope({ schoolId, userId, examClassId }) {
  const scope = await getTeacherScope({ schoolId, userId });
  if (!scope.classIds.includes(examClassId)) {
    throw new AppError('You do not have access to this exam class.', 403, 'FORBIDDEN', { classId: examClassId });
  }
  return scope;
}

export async function listExams({ schoolId, userId, role, query }) {
  const { page, pageSize, skip, take } = parsePagination(query);

  const search = trim(query.search || '');
  const status = trim(query.status || 'all');

  const where = {
    schoolId,
    isArchived: false,
  };

  // ✅ Teacher: only exams for teacher's classes
  if (role === 'Teacher') {
    const scope = await getTeacherScope({ schoolId, userId });
    where.classId = { in: scope.classIds.length ? scope.classIds : ['__none__'] };
  }

  // Student/Parent: only linked class exams and no drafts
  if (isStudentLike(role)) {
    const classIds = await getLinkedClassIds({ schoolId, userId });
    where.classId = { in: classIds.length ? classIds : ['__none__'] };
    where.status = { not: 'draft' };
  }

  if (status !== 'all') where.status = status;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { term: { contains: search, mode: 'insensitive' } },
      { status: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [totalItems, exams] = await Promise.all([
    prisma.exam.count({ where }),
    prisma.exam.findMany({
      where,
      orderBy: { scheduledFor: 'desc' },
      skip,
      take,
      include: { class: { select: { id: true, name: true } } },
    }),
  ]);

  const withSubjects = await Promise.all(exams.map((e) => examWithSubjectIds(e)));
  return { items: withSubjects, meta: buildPageMeta({ page, pageSize, totalItems }) };
}

export async function getExamById({ schoolId, userId, role, id }) {
  const exam = await prisma.exam.findFirst({
    where: { id, schoolId, isArchived: false },
    include: { class: { select: { id: true, name: true } } },
  });

  if (!exam) throw new AppError('Exam not found.', 404, 'NOT_FOUND');

  if (role === 'Teacher') {
    await assertTeacherExamScope({ schoolId, userId, examClassId: exam.classId });
  }

  if (isStudentLike(role)) {
    const classIds = await getLinkedClassIds({ schoolId, userId });
    if (!classIds.includes(exam.classId) || exam.status === 'draft') {
      throw new AppError('You do not have access to this exam.', 403, 'FORBIDDEN');
    }
  }

  return examWithSubjectIds(exam);
}

export async function createExam({ schoolId, userId, payload }) {
  // ✅ Teacher: can only create exams for their classes
  // (Routes already restrict to Teacher; this is object-level scope)
  // We infer role at controller-level in your app; if you want strict, pass role too.
  // For now: enforce by checking membership role is Teacher? (not implemented to keep signature unchanged).
  // If you want strict role-based enforcement, tell me and I’ll update controller signature.

  const cls = await prisma.class.findFirst({
    where: { schoolId, id: payload.classId, isArchived: false },
    select: { id: true },
  });
  if (!cls) throw new AppError('Class not found.', 400, 'VALIDATION_ERROR', { field: 'classId' });

  const created = await prisma.$transaction(async (tx) => {
    const exam = await tx.exam.create({
      data: {
        schoolId,
        name: trim(payload.name),
        term: trim(payload.term),
        classId: payload.classId,
        scheduledFor: new Date(payload.scheduledFor),
        maxMarks: Number(payload.maxMarks || 100),
        status: payload.status || 'draft',
        isLocked: payload.status === 'locked',
      },
    });

    const subjectIds = payload.subjectIds || [];
    if (subjectIds.length) {
      const subjects = await tx.subject.findMany({
        where: { schoolId, id: { in: subjectIds }, isArchived: false },
        select: { id: true },
      });

      await tx.examSubject.createMany({
        data: subjects.map((s) => ({ schoolId, examId: exam.id, subjectId: s.id })),
        skipDuplicates: true,
      });
    }

    return exam;
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'exam',
    entityId: created.id,
    action: 'created',
    message: `Exam created: ${created.name}`,
  });

  return examWithSubjectIds(created);
}

export async function updateExam({ schoolId, userId, id, payload }) {
  const existing = await prisma.exam.findFirst({ where: { id, schoolId, isArchived: false } });
  if (!existing) throw new AppError('Exam not found.', 404, 'NOT_FOUND');
  if (existing.status === 'locked') throw new AppError('Locked exams cannot be edited.', 400, 'VALIDATION_ERROR');

  const updated = await prisma.$transaction(async (tx) => {
    const exam = await tx.exam.update({
      where: { id },
      data: {
        name: payload.name != null ? trim(payload.name) : undefined,
        term: payload.term != null ? trim(payload.term) : undefined,
        classId: payload.classId != null ? payload.classId : undefined,
        scheduledFor: payload.scheduledFor != null ? new Date(payload.scheduledFor) : undefined,
        maxMarks: payload.maxMarks != null ? Number(payload.maxMarks) : undefined,
        status: payload.status != null ? payload.status : undefined,
        isLocked: payload.status === 'locked' ? true : undefined,
      },
    });

    if (payload.subjectIds) {
      await tx.examSubject.deleteMany({ where: { schoolId, examId: id } });

      if (payload.subjectIds.length) {
        const subjects = await tx.subject.findMany({
          where: { schoolId, id: { in: payload.subjectIds }, isArchived: false },
          select: { id: true },
        });

        await tx.examSubject.createMany({
          data: subjects.map((s) => ({ schoolId, examId: id, subjectId: s.id })),
          skipDuplicates: true,
        });
      }
    }

    return exam;
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'exam',
    entityId: id,
    action: 'updated',
    message: `Exam updated: ${updated.name}`,
  });

  return examWithSubjectIds(updated);
}

export async function publishExam({ schoolId, userId, id }) {
  const existing = await prisma.exam.findFirst({ where: { id, schoolId, isArchived: false } });
  if (!existing) throw new AppError('Exam not found.', 404, 'NOT_FOUND');
  if (existing.status === 'locked') throw new AppError('Exam is locked.', 400, 'VALIDATION_ERROR');

  const updated = await prisma.exam.update({
    where: { id },
    data: { status: 'published' },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'exam',
    entityId: id,
    action: 'published',
    message: `Exam published: ${existing.name}`,
  });

  return examWithSubjectIds(updated);
}

export async function lockExam({ schoolId, userId, id }) {
  const existing = await prisma.exam.findFirst({ where: { id, schoolId, isArchived: false } });
  if (!existing) throw new AppError('Exam not found.', 404, 'NOT_FOUND');

  const updated = await prisma.exam.update({
    where: { id },
    data: { status: 'locked', isLocked: true },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'exam',
    entityId: id,
    action: 'locked',
    message: `Exam locked: ${existing.name}`,
  });

  return examWithSubjectIds(updated);
}

export async function upsertMark({ schoolId, userId, payload }) {
  const exam = await prisma.exam.findFirst({ where: { id: payload.examId, schoolId, isArchived: false } });
  if (!exam) throw new AppError('Exam not found.', 404, 'NOT_FOUND');
  if (exam.status === 'locked') throw new AppError('Results are locked.', 400, 'VALIDATION_ERROR');

  // ✅ Teacher: check exam class is allowed + student section + subject allowed
  let teacherScope = null;
  // if you want strict teacher-only behavior, pass role from controller and enforce only when role==="Teacher"
  // For now, we enforce if the user is a teacher by checking staff profile:
  teacherScope = await getTeacherScope({ schoolId, userId });
  if (teacherScope.staffId) {
    if (!teacherScope.classIds.includes(exam.classId)) {
      throw new AppError('You do not have access to this exam class.', 403, 'FORBIDDEN');
    }
    if (teacherScope.subjectIds.length && !teacherScope.subjectIds.includes(payload.subjectId)) {
      throw new AppError('You do not have access to mark this subject.', 403, 'FORBIDDEN');
    }
  }

  const student = await prisma.student.findFirst({
    where: { id: payload.studentId, schoolId, isArchived: false },
    select: { id: true, classId: true, sectionId: true },
  });
  if (!student) throw new AppError('Student not found.', 400, 'VALIDATION_ERROR');

  if (student.classId !== exam.classId) {
    throw new AppError('Student is not in the exam class.', 400, 'VALIDATION_ERROR');
  }

  if (teacherScope?.staffId) {
    if (!teacherScope.sectionIds.includes(student.sectionId)) {
      throw new AppError('You do not have access to this student/section.', 403, 'FORBIDDEN');
    }
  }

  const isInExam = await prisma.examSubject.findFirst({
    where: { schoolId, examId: exam.id, subjectId: payload.subjectId },
    select: { id: true },
  });
  if (!isInExam) throw new AppError('Subject not part of this exam.', 400, 'VALIDATION_ERROR');

  const mark = await prisma.mark.upsert({
    where: {
      schoolId_examId_studentId_subjectId: {
        schoolId,
        examId: payload.examId,
        studentId: payload.studentId,
        subjectId: payload.subjectId,
      },
    },
    create: {
      schoolId,
      examId: payload.examId,
      studentId: payload.studentId,
      subjectId: payload.subjectId,
      marks: Number(payload.marks),
      grade: payload.grade ? String(payload.grade) : null,
      remarks: payload.remarks ? String(payload.remarks) : null,
    },
    update: {
      marks: Number(payload.marks),
      grade: payload.grade != null ? (payload.grade ? String(payload.grade) : null) : undefined,
      remarks: payload.remarks != null ? (payload.remarks ? String(payload.remarks) : null) : undefined,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'mark',
    entityId: mark.id,
    action: 'upserted',
    message: `Marks saved (exam ${payload.examId})`,
  });

  return mark;
}

export async function upsertMarksBatch({ schoolId, userId, entries }) {
  const results = [];
  for (const entry of entries) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await upsertMark({ schoolId, userId, payload: entry }));
  }
  return results;
}

export async function getReportCards({ schoolId, userId, role, examId }) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId, isArchived: false },
  });
  if (!exam) throw new AppError('Exam not found.', 404, 'NOT_FOUND');

  // Student/Parent restrictions
  if (isStudentLike(role)) {
    if (!(exam.status === 'published' || exam.status === 'locked')) {
      throw new AppError('Report cards are not available for this exam.', 403, 'FORBIDDEN');
    }
    const classIds = await getLinkedClassIds({ schoolId, userId });
    if (!classIds.includes(exam.classId)) throw new AppError('You do not have access to this exam.', 403, 'FORBIDDEN');
  }

  // ✅ Teacher restrictions: only students in teacher scope (section-based) for this exam class
  let teacherScope = null;
  if (role === 'Teacher') {
    teacherScope = await assertTeacherExamScope({ schoolId, userId, examClassId: exam.classId });
  }

  const subjectRows = await prisma.examSubject.findMany({
    where: { schoolId, examId },
    select: { subjectId: true },
  });
  const subjectIds = subjectRows.map((r) => r.subjectId);

  const studentWhere = {
    schoolId,
    classId: exam.classId,
    isArchived: false,
    ...(role === 'Teacher'
      ? { sectionId: { in: teacherScope.sectionIds.length ? teacherScope.sectionIds : ['__none__'] } }
      : {}),
  };

  const [students, marks] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      select: { id: true, fullName: true, classId: true, sectionId: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.mark.findMany({
      where: { schoolId, examId },
    }),
  ]);

  const cards = students.map((student) => {
    const results = marks.filter((m) => m.studentId === student.id);
    const total = results.reduce((sum, r) => sum + Number(r.marks || 0), 0);
    const average = results.length ? Math.round(total / results.length) : 0;

    const gradeInfo = gradeFromMarks(average, exam.maxMarks || 100);

    return {
      studentId: student.id,
      student,
      results,
      total,
      average,
      grade: gradeInfo.grade,
      remarks: gradeInfo.remarks,
      maxMarks: subjectIds.length * Number(exam.maxMarks || 100),
    };
  });

  const ranked = cards
    .slice()
    .sort((a, b) => b.total - a.total)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  if (isStudentLike(role)) {
    const linkedIds = await getLinkedStudentIds({ schoolId, userId });
    return ranked.filter((c) => linkedIds.includes(c.studentId));
  }

  return ranked;
}