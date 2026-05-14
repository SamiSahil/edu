import argon2 from 'argon2';
import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { buildPageMeta, parsePagination } from '../../shared/utils/pagination.js';
import { lower, trim, normalizeEmail, normalizeUsername } from '../../shared/utils/ids.js';
import { writeAuditLog } from '../audit/audit.service.js';
import { nextSequence } from '../../shared/utils/sequence.js';
import { getTeacherScope } from '../../shared/scopes/teacherScope.js';

function isStudentLike(role) {
  return role === 'Student' || role === 'Parent';
}

async function assertStudentObjectAccess({ schoolId, userId, role, studentId }) {
  // Parent/Student: must be linked
  if (isStudentLike(role)) {
    const link = await prisma.studentLink.findFirst({
      where: { schoolId, userId, studentId },
      select: { id: true },
    });

    if (!link) {
      throw new AppError('You do not have access to this student.', 403, 'FORBIDDEN');
    }
    return true;
  }

  // Teacher: must be in teacher scope (section-based)
  if (role === 'Teacher') {
    const scope = await getTeacherScope({ schoolId, userId });

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId, isArchived: false },
      select: { sectionId: true },
    });

    if (!student || !scope.sectionIds.includes(student.sectionId)) {
      throw new AppError('You do not have access to this student.', 403, 'FORBIDDEN');
    }
  }

  return true;
}

function emailLocalPart(email) {
  const e = String(email || '').trim();
  const at = e.indexOf('@');
  const base = at > 0 ? e.slice(0, at) : e;
  return base.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || 'user';
}

async function generateUniqueUsername(baseUsername) {
  const base = trim(baseUsername).toLowerCase().slice(0, 32) || 'user';
  const baseLower = normalizeUsername(base);

  const exists = await prisma.user.findUnique({ where: { usernameLower: baseLower } });
  if (!exists) return base;

  for (let i = 2; i < 9999; i += 1) {
    const candidate = `${base}-${i}`.slice(0, 40);
    // eslint-disable-next-line no-await-in-loop
    const dup = await prisma.user.findUnique({ where: { usernameLower: normalizeUsername(candidate) } });
    if (!dup) return candidate;
  }

  throw new AppError('Unable to generate a unique username.', 500, 'INTERNAL_ERROR');
}

async function assertEmailNotTaken(email, fieldName) {
  const emailLower = normalizeEmail(email);
  const dup = await prisma.user.findUnique({ where: { emailLower } });
  if (dup) throw new AppError('Email already exists.', 409, 'CONFLICT', { field: fieldName });
  return emailLower;
}

export async function listStudents({ schoolId, userId, role, query }) {
  const { page, pageSize, skip, take } = parsePagination(query);

  const search = trim(query.search || '');
  const status = trim(query.status || 'all');
  const classId = trim(query.classId || 'all');
  const sectionId = trim(query.sectionId || 'all');
  const gender = trim(query.gender || 'all');
  const admissionYear = trim(query.admissionYear || 'all');

  const where = {
    schoolId,
    isArchived: status === 'archived',
  };

  if (status !== 'all') where.status = status;
  if (classId !== 'all') where.classId = classId;
  if (sectionId !== 'all') where.sectionId = sectionId;
  if (gender !== 'all') where.gender = gender;
  if (admissionYear !== 'all' && admissionYear) where.admissionYear = Number(admissionYear);

  // ✅ Teacher scope restriction
  if (role === 'Teacher') {
    const scope = await getTeacherScope({ schoolId, userId });
    where.sectionId = { in: scope.sectionIds.length ? scope.sectionIds : ['__none__'] };
  }

  if (search) {
    const q = search;
    const qLower = lower(search);

    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { admissionNoLower: { contains: qLower } },
      { phone: { contains: q } },
      { email: { contains: q, mode: 'insensitive' } },
      { guardian: { name: { contains: q, mode: 'insensitive' } } },
      { guardian: { phone: { contains: q } } },
    ];
  }

  const [totalItems, items] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: { admissionDate: 'desc' },
      skip,
      take,
      include: {
        guardian: { select: { id: true, name: true, phone: true } },
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { items, meta: buildPageMeta({ page, pageSize, totalItems }) };
}

export async function getStudentById({ schoolId, userId, role, id }) {
  const student = await prisma.student.findFirst({
    where: { id, schoolId },
    include: {
      guardian: true,
      class: true,
      section: true,
      links: {
        include: {
          user: { select: { id: true, email: true, username: true } },
        },
      },
    },
  });

  if (!student) throw new AppError('Student not found.', 404, 'NOT_FOUND');

  await assertStudentObjectAccess({ schoolId, userId, role, studentId: id });
  return student;
}

/**
 * Create/update/archive/promote/transfer left as-is.
 * (If you want teacher to be able to update only their students, we can scope those too.)
 */
export async function createStudent({ schoolId, userId, payload }) {
  let admissionNo = trim(payload.admissionNo || '');
  if (!admissionNo) {
    admissionNo = await nextSequence({ schoolId, key: 'admissionNo', prefix: 'ADM' });
  }

  const admissionNoLower = lower(admissionNo);

  const dup = await prisma.student.findFirst({
    where: { schoolId, admissionNoLower, isArchived: false },
    select: { id: true },
  });
  if (dup) throw new AppError('Admission number already exists.', 409, 'CONFLICT', { field: 'admissionNo' });

  const createStudentLogin = Boolean(payload.createStudentLogin);
  const createParentLogin = Boolean(payload.createParentLogin);

  if (createStudentLogin) {
    const email = trim(payload.studentLoginEmail || '');
    const password = trim(payload.studentLoginPassword || '');
    if (!email) throw new AppError('Student login email is required.', 400, 'VALIDATION_ERROR', { field: 'studentLoginEmail' });
    if (password.length < 8) throw new AppError('Student password is required (min 8).', 400, 'VALIDATION_ERROR', { field: 'studentLoginPassword' });
  }

  if (createParentLogin) {
    const email = trim(payload.parentLoginEmail || '');
    const password = trim(payload.parentLoginPassword || '');
    if (!email) throw new AppError('Parent login email is required.', 400, 'VALIDATION_ERROR', { field: 'parentLoginEmail' });
    if (password.length < 8) throw new AppError('Parent password is required (min 8).', 400, 'VALIDATION_ERROR', { field: 'parentLoginPassword' });
  }

  let guardianId = payload.guardianId || null;

  if (!guardianId) {
    const phone = trim(payload.guardianPhone);
    const email = trim(payload.guardianEmail || '');

    const existingGuardian = await prisma.guardian.findFirst({
      where: {
        schoolId,
        isArchived: false,
        OR: [{ phone }, ...(email ? [{ email }] : [])],
      },
      select: { id: true },
    });

    if (existingGuardian) {
      guardianId = existingGuardian.id;
    } else {
      const createdGuardian = await prisma.guardian.create({
        data: {
          schoolId,
          name: trim(payload.guardianName),
          phone,
          email: email || null,
          relation: payload.guardianRelation ? trim(payload.guardianRelation) : 'Guardian',
        },
        select: { id: true },
      });
      guardianId = createdGuardian.id;
    }
  } else {
    const g = await prisma.guardian.findFirst({
      where: { schoolId, id: guardianId, isArchived: false },
      select: { id: true },
    });
    if (!g) throw new AppError('Guardian not found.', 400, 'VALIDATION_ERROR', { field: 'guardianId' });
  }

  const created = await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        schoolId,
        fullName: trim(payload.fullName),
        admissionNo,
        admissionNoLower,

        dob: new Date(payload.dob),
        gender: payload.gender,

        classId: payload.classId,
        sectionId: payload.sectionId,
        guardianId,

        admissionDate: new Date(payload.admissionDate),
        admissionYear: Number(payload.admissionYear),

        phone: trim(payload.phone),
        email: payload.email ? trim(payload.email) : null,

        status: payload.status || 'active',
        notes: payload.notes ? String(payload.notes) : null,
        documents: payload.documents ? String(payload.documents) : null,

        avatarFileId: payload.avatarFileId || null,
      },
    });

    if (createStudentLogin) {
      const email = trim(payload.studentLoginEmail);
      const emailLower = await assertEmailNotTaken(email, 'studentLoginEmail');

      const username = await generateUniqueUsername(emailLocalPart(email));
      const usernameLower = normalizeUsername(username);

      const passwordHash = await argon2.hash(trim(payload.studentLoginPassword));

      const u = await tx.user.create({
        data: {
          name: trim(payload.fullName),
          email,
          emailLower,
          username,
          usernameLower,
          passwordHash,
        },
      });

      await tx.schoolMembership.create({
        data: { schoolId, userId: u.id, role: 'Student' },
      });

      await tx.studentLink.create({
        data: { schoolId, userId: u.id, studentId: student.id, role: 'Student' },
      });
    }

    if (createParentLogin) {
      const email = trim(payload.parentLoginEmail);
      const emailLower = await assertEmailNotTaken(email, 'parentLoginEmail');

      const username = await generateUniqueUsername(emailLocalPart(email));
      const usernameLower = normalizeUsername(username);

      const passwordHash = await argon2.hash(trim(payload.parentLoginPassword));

      const u = await tx.user.create({
        data: {
          name: `${trim(payload.fullName)} Parent`,
          email,
          emailLower,
          username,
          usernameLower,
          passwordHash,
        },
      });

      await tx.schoolMembership.create({
        data: { schoolId, userId: u.id, role: 'Parent' },
      });

      await tx.studentLink.create({
        data: { schoolId, userId: u.id, studentId: student.id, role: 'Parent' },
      });
    }

    return student;
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'student',
    entityId: created.id,
    action: 'created',
    message: `Student created: ${payload.fullName}`,
  });

  return getStudentById({ schoolId, userId, role: 'Admin', id: created.id });
}

export async function updateStudent({ schoolId, userId, id, payload }) {
  const existing = await prisma.student.findFirst({ where: { id, schoolId } });
  if (!existing) throw new AppError('Student not found.', 404, 'NOT_FOUND');

  if (payload.admissionNo != null && !trim(payload.admissionNo)) {
    throw new AppError('Admission number cannot be empty.', 400, 'VALIDATION_ERROR', { field: 'admissionNo' });
  }

  let admissionNoLower = existing.admissionNoLower;

  if (payload.admissionNo) {
    admissionNoLower = lower(payload.admissionNo);

    const dup = await prisma.student.findFirst({
      where: { schoolId, admissionNoLower, id: { not: id }, isArchived: false },
      select: { id: true },
    });
    if (dup) throw new AppError('Admission number already exists.', 409, 'CONFLICT', { field: 'admissionNo' });
  }

  const updated = await prisma.student.update({
    where: { id },
    data: {
      fullName: payload.fullName != null ? trim(payload.fullName) : undefined,
      admissionNo: payload.admissionNo != null ? trim(payload.admissionNo) : undefined,
      admissionNoLower: payload.admissionNo != null ? admissionNoLower : undefined,

      dob: payload.dob != null ? new Date(payload.dob) : undefined,
      gender: payload.gender != null ? payload.gender : undefined,

      classId: payload.classId != null ? payload.classId : undefined,
      sectionId: payload.sectionId != null ? payload.sectionId : undefined,
      guardianId: payload.guardianId != null ? payload.guardianId : undefined,

      admissionDate: payload.admissionDate != null ? new Date(payload.admissionDate) : undefined,
      admissionYear: payload.admissionYear != null ? Number(payload.admissionYear) : undefined,

      phone: payload.phone != null ? trim(payload.phone) : undefined,
      email: payload.email != null ? (payload.email ? trim(payload.email) : null) : undefined,

      status: payload.status != null ? payload.status : undefined,

      notes: payload.notes != null ? (payload.notes ? String(payload.notes) : null) : undefined,
      documents: payload.documents != null ? (payload.documents ? String(payload.documents) : null) : undefined,

      avatarFileId: payload.avatarFileId !== undefined ? payload.avatarFileId : undefined,
    },
    include: { guardian: true, class: true, section: true },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'student',
    entityId: updated.id,
    action: 'updated',
    message: `Student updated: ${updated.fullName}`,
  });

  return updated;
}

export async function archiveStudent({ schoolId, userId, id }) {
  const existing = await prisma.student.findFirst({ where: { id, schoolId } });
  if (!existing) throw new AppError('Student not found.', 404, 'NOT_FOUND');

  const updated = await prisma.student.update({
    where: { id },
    data: { isArchived: true, status: 'archived' },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'student',
    entityId: id,
    action: 'archived',
    message: `Student archived: ${existing.fullName}`,
  });

  return updated;
}

export async function transferStudent({ schoolId, userId, id, reason }) {
  const existing = await prisma.student.findFirst({ where: { id, schoolId } });
  if (!existing) throw new AppError('Student not found.', 404, 'NOT_FOUND');

  const updated = await prisma.student.update({
    where: { id },
    data: { status: 'transferred', notes: reason ? String(reason) : existing.notes },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'student',
    entityId: id,
    action: 'transferred',
    message: `Student transferred: ${existing.fullName}. Reason: ${reason || ''}`.trim(),
  });

  return updated;
}

export async function promoteStudent({ schoolId, userId, id, nextClassId, nextSectionId }) {
  const existing = await prisma.student.findFirst({
    where: { id, schoolId },
    include: { class: true },
  });
  if (!existing) throw new AppError('Student not found.', 404, 'NOT_FOUND');

  let targetClassId = nextClassId || null;
  let targetSectionId = nextSectionId || null;

  if (!targetClassId) {
    const classes = await prisma.class.findMany({
      where: { schoolId, isArchived: false },
      orderBy: { order: 'asc' },
      select: { id: true, order: true },
    });

    const currentOrder = existing.class?.order ?? null;
    const nextClass = classes.find((c) => currentOrder != null && c.order > currentOrder) || null;
    targetClassId = nextClass?.id || existing.classId;
  }

  if (!targetSectionId) {
    const section = await prisma.section.findFirst({
      where: { schoolId, classId: targetClassId, isArchived: false },
      orderBy: { name: 'asc' },
      select: { id: true },
    });
    targetSectionId = section?.id || existing.sectionId;
  }

  const updated = await prisma.student.update({
    where: { id },
    data: { classId: targetClassId, sectionId: targetSectionId, status: 'promoted' },
    include: { guardian: true, class: true, section: true },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'student',
    entityId: id,
    action: 'promoted',
    message: `Student promoted: ${existing.fullName}`,
  });

  return updated;
}