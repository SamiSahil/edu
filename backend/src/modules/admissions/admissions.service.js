import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { parsePagination, buildPageMeta } from '../../shared/utils/pagination.js';
import { lower, trim } from '../../shared/utils/ids.js';
import { writeAuditLog } from '../audit/audit.service.js';
import { nextSequence } from '../../shared/utils/sequence.js';

async function assertClassExists({ schoolId, classId }) {
  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId, isArchived: false },
    select: { id: true },
  });
  if (!cls) throw new AppError('Requested class not found.', 400, 'VALIDATION_ERROR', { field: 'requestedClassId' });
}

export async function listAdmissions({ schoolId, query }) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const search = trim(query.search || '');
  const status = trim(query.status || 'all');

  const where = {
    schoolId,
    isArchived: false,
  };

  if (status !== 'all') where.status = status;

  if (search) {
    where.OR = [
      { applicantName: { contains: search, mode: 'insensitive' } },
      { parentName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
      { source: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [totalItems, items] = await Promise.all([
    prisma.admission.count({ where }),
    prisma.admission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        requestedClass: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { items, meta: buildPageMeta({ page, pageSize, totalItems }) };
}

export async function getAdmissionById({ schoolId, id }) {
  const admission = await prisma.admission.findFirst({
    where: { schoolId, id },
    include: { requestedClass: true },
  });
  if (!admission) throw new AppError('Admission not found.', 404, 'NOT_FOUND');
  return admission;
}

export async function createAdmission({ schoolId, userId, payload }) {
  await assertClassExists({ schoolId, classId: payload.requestedClassId });

  // Duplicate phone check (per school, non-archived)
  const dupPhone = await prisma.admission.findFirst({
    where: {
      schoolId,
      phone: trim(payload.phone),
      isArchived: false,
    },
    select: { id: true },
  });
  if (dupPhone) {
    throw new AppError('Phone number already exists in admissions.', 409, 'CONFLICT', { field: 'phone' });
  }

  const admission = await prisma.admission.create({
    data: {
      schoolId,
      applicantName: trim(payload.applicantName),
      parentName: trim(payload.parentName),
      phone: trim(payload.phone),
      email: lower(payload.email),
      requestedClassId: payload.requestedClassId,
      source: trim(payload.source),
      previousSchool: payload.previousSchool ? trim(payload.previousSchool) : null,
      status: payload.status || 'new',
      notes: payload.notes ? String(payload.notes) : null,
    },
    include: { requestedClass: true },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'admission',
    entityId: admission.id,
    action: 'created',
    message: `Admission created for ${admission.applicantName}`,
  });

  return admission;
}

export async function updateAdmission({ schoolId, userId, id, payload }) {
  const existing = await prisma.admission.findFirst({ where: { schoolId, id } });
  if (!existing) throw new AppError('Admission not found.', 404, 'NOT_FOUND');

  if (payload.requestedClassId) {
    await assertClassExists({ schoolId, classId: payload.requestedClassId });
  }

  if (payload.phone) {
    const dup = await prisma.admission.findFirst({
      where: {
        schoolId,
        phone: trim(payload.phone),
        isArchived: false,
        id: { not: id },
      },
      select: { id: true },
    });
    if (dup) throw new AppError('Phone number already exists in admissions.', 409, 'CONFLICT', { field: 'phone' });
  }

  const updated = await prisma.admission.update({
    where: { id },
    data: {
      applicantName: payload.applicantName != null ? trim(payload.applicantName) : undefined,
      parentName: payload.parentName != null ? trim(payload.parentName) : undefined,
      phone: payload.phone != null ? trim(payload.phone) : undefined,
      email: payload.email != null ? lower(payload.email) : undefined,
      requestedClassId: payload.requestedClassId != null ? payload.requestedClassId : undefined,
      source: payload.source != null ? trim(payload.source) : undefined,
      previousSchool: payload.previousSchool != null ? (payload.previousSchool ? trim(payload.previousSchool) : null) : undefined,
      status: payload.status != null ? payload.status : undefined,
      notes: payload.notes != null ? (payload.notes ? String(payload.notes) : null) : undefined,
    },
    include: { requestedClass: true },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'admission',
    entityId: updated.id,
    action: 'updated',
    message: `Admission updated for ${updated.applicantName}`,
  });

  return updated;
}

export async function archiveAdmission({ schoolId, userId, id }) {
  const existing = await prisma.admission.findFirst({ where: { schoolId, id } });
  if (!existing) throw new AppError('Admission not found.', 404, 'NOT_FOUND');

  const updated = await prisma.admission.update({
    where: { id },
    data: { isArchived: true, status: 'archived' },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'admission',
    entityId: id,
    action: 'archived',
    message: `Admission archived for ${existing.applicantName}`,
  });

  return updated;
}

export async function convertAdmissionToStudent({ schoolId, userId, id, overrides = {} }) {
  const admission = await prisma.admission.findFirst({
    where: { schoolId, id },
  });
  if (!admission) throw new AppError('Admission not found.', 404, 'NOT_FOUND');

  if (admission.isArchived) throw new AppError('Admission is archived.', 400, 'VALIDATION_ERROR');

  if (admission.status !== 'approved') {
    throw new AppError('Only approved admissions can be converted.', 400, 'VALIDATION_ERROR', {
      status: admission.status,
    });
  }

  // Find/create guardian (per school) by phone/email
  const guardian =
    (await prisma.guardian.findFirst({
      where: {
        schoolId,
        OR: [
          { phone: admission.phone },
          { email: admission.email },
        ],
        isArchived: false,
      },
    })) ||
    (overrides.guardianId
      ? await prisma.guardian.findFirst({ where: { id: overrides.guardianId, schoolId, isArchived: false } })
      : null);

  const ensuredGuardian =
    guardian ||
    (await prisma.guardian.create({
      data: {
        schoolId,
        name: admission.parentName,
        phone: admission.phone,
        email: admission.email,
        relation: 'Guardian',
      },
    }));

  // Ensure section (either override or first section of requested class)
  let sectionId = overrides.sectionId || null;
  if (!sectionId) {
    const sec = await prisma.section.findFirst({
      where: { schoolId, classId: admission.requestedClassId, isArchived: false },
      orderBy: { name: 'asc' },
      select: { id: true },
    });
    if (!sec) {
      throw new AppError('No section exists for the requested class. Create a section first.', 400, 'VALIDATION_ERROR');
    }
    sectionId = sec.id;
  } else {
    const sec = await prisma.section.findFirst({ where: { schoolId, id: sectionId, isArchived: false } });
    if (!sec) throw new AppError('Selected section not found.', 400, 'VALIDATION_ERROR');
  }

  // Generate admission number per school
  const admissionNo = await nextSequence({ schoolId, key: 'admissionNo', prefix: 'ADM' });

  const studentDob = overrides.dob && !Number.isNaN(new Date(overrides.dob).getTime())
    ? new Date(overrides.dob)
    : new Date(); // fallback like your frontend

  const studentGender = overrides.gender || 'male';

  const created = await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        schoolId,
        fullName: admission.applicantName,
        admissionNo,
        admissionNoLower: lower(admissionNo),
        dob: studentDob,
        gender: studentGender,

        classId: admission.requestedClassId,
        sectionId,
        guardianId: ensuredGuardian.id,

        admissionDate: new Date(),
        admissionYear: new Date().getFullYear(),

        phone: admission.phone,
        email: admission.email,
        status: 'active',
        notes: admission.notes || null,
      },
    });

    const updatedAdmission = await tx.admission.update({
      where: { id: admission.id },
      data: {
        status: 'converted',
        convertedStudentId: student.id,
      },
    });

    return { student, updatedAdmission };
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'admission',
    entityId: admission.id,
    action: 'converted',
    message: `Admission converted to student: ${admission.applicantName}`,
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'student',
    entityId: created.student.id,
    action: 'created',
    message: `Student created from admission: ${admission.applicantName}`,
  });

  return { student: created.student };
}