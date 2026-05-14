import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { trim } from '../../shared/utils/ids.js';
import { writeAuditLog } from '../audit/audit.service.js';
import { enqueueEmail } from '../../infra/queues/email.queue.js';
import { enqueueSms } from '../../infra/queues/sms.queue.js';
import { basicTemplate } from '../../infra/email/templates/basic.template.js';
import { getTeacherScope } from '../../shared/scopes/teacherScope.js';

function isStudentLike(role) {
  return role === 'Student' || role === 'Parent';
}

function normalizeTargets(payload) {
  return {
    audienceType: payload.audienceType || 'role',
    targetRoles: payload.targetRoles || [],
    targetClassIds: payload.targetClassIds || [],
    targetSectionIds: payload.targetSectionIds || [],
    targetStudentIds: payload.targetStudentIds || [],
  };
}

async function linkedStudents({ schoolId, userId }) {
  const links = await prisma.studentLink.findMany({
    where: { schoolId, userId },
    select: { studentId: true },
  });

  if (!links.length) return [];

  return prisma.student.findMany({
    where: { schoolId, id: { in: links.map((l) => l.studentId) }, isArchived: false },
    select: { id: true, classId: true, sectionId: true, guardianId: true },
  });
}

function recordTargetsSession({ record, sessionRole, linkedStudentsList, linkedStudentIds }) {
  const audienceType = String(record.audienceType || 'role');
  if (!sessionRole) return false;

  if (!isStudentLike(sessionRole)) return true;

  if (audienceType === 'school') return true;

  if (audienceType === 'role') {
    const roles = record.targetRoles || [];
    return roles.includes(sessionRole);
  }

  const linkedClassIds = new Set(linkedStudentsList.map((s) => s.classId));
  const linkedSectionIds = new Set(linkedStudentsList.map((s) => s.sectionId));

  if (audienceType === 'class') {
    const targets = record.targetClassIds || [];
    return targets.some((id) => linkedClassIds.has(id));
  }

  if (audienceType === 'section') {
    const targets = record.targetSectionIds || [];
    return targets.some((id) => linkedSectionIds.has(id));
  }

  if (audienceType === 'individual') {
    const targets = record.targetStudentIds || [];
    return targets.some((id) => linkedStudentIds.includes(id));
  }

  return false;
}

export async function getCommunicationLookups({ schoolId, userId, role, search = '' }) {
  const [classes, sections] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId, isArchived: false },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, code: true },
    }),
    prisma.section.findMany({
      where: { schoolId, isArchived: false },
      orderBy: [{ classId: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, classId: true },
    }),
  ]);

  // ✅ Teacher: only show their scoped classes/sections in lookups
  if (role === 'Teacher') {
    const scope = await getTeacherScope({ schoolId, userId });
    const allowedClassIds = new Set(scope.classIds);
    const allowedSectionIds = new Set(scope.sectionIds);

    const clsFiltered = classes.filter((c) => allowedClassIds.has(c.id));
    const secFiltered = sections.filter((s) => allowedSectionIds.has(s.id));

    classes.length = 0;
    sections.length = 0;
    clsFiltered.forEach((c) => classes.push(c));
    secFiltered.forEach((s) => sections.push(s));
  }

  let students = [];
  const q = String(search || '').trim();
  if (q.length >= 2) {
    const baseWhere = {
      schoolId,
      isArchived: false,
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { admissionNoLower: { contains: q.toLowerCase() } },
        { phone: { contains: q } },
      ],
    };

    // ✅ Teacher: only allow searching students in their scoped sections
    if (role === 'Teacher') {
      const scope = await getTeacherScope({ schoolId, userId });
      baseWhere.sectionId = { in: scope.sectionIds.length ? scope.sectionIds : ['__none__'] };
    }

    students = await prisma.student.findMany({
      where: baseWhere,
      take: 50,
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, classId: true, sectionId: true },
    });
  }

  return { classes, sections, students };
}

export async function listCommunications({ schoolId, userId, role, status = 'all' }) {
  const where = { schoolId, isArchived: false };

  if (isStudentLike(role)) where.status = 'sent';
  else if (status !== 'all') where.status = status;

  const rows = await prisma.communication.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  if (!isStudentLike(role)) return rows;

  const linked = await linkedStudents({ schoolId, userId });
  const linkedIds = linked.map((s) => s.id);

  return rows.filter((record) =>
    recordTargetsSession({
      record,
      sessionRole: role,
      linkedStudentsList: linked,
      linkedStudentIds: linkedIds,
    })
  );
}

export async function getCommunicationById({ schoolId, userId, role, id }) {
  const record = await prisma.communication.findFirst({
    where: { id, schoolId, isArchived: false },
  });

  if (!record) throw new AppError('Communication not found.', 404, 'NOT_FOUND');

  if (!isStudentLike(role)) return record;

  if (record.status !== 'sent') throw new AppError('Access denied.', 403, 'FORBIDDEN');

  const linked = await linkedStudents({ schoolId, userId });
  const linkedIds = linked.map((s) => s.id);

  const ok = recordTargetsSession({
    record,
    sessionRole: role,
    linkedStudentsList: linked,
    linkedStudentIds: linkedIds,
  });

  if (!ok) throw new AppError('Access denied.', 403, 'FORBIDDEN');

  return record;
}

async function resolveRecipients({ schoolId, record }) {
  const targets = normalizeTargets(record);

  const emails = new Set();
  const phones = new Set();

  const addEmail = (e) => {
    const v = String(e || '').trim();
    if (v && v.includes('@')) emails.add(v);
  };
  const addPhone = (p) => {
    const v = String(p || '').trim();
    if (v && v.length >= 7) phones.add(v);
  };

  if (targets.audienceType === 'school') {
    const memberships = await prisma.schoolMembership.findMany({
      where: { schoolId },
      include: { user: { select: { email: true } } },
    });
    memberships.forEach((m) => addEmail(m.user?.email));

    const guardians = await prisma.guardian.findMany({
      where: { schoolId, isArchived: false },
      select: { email: true, phone: true },
    });
    guardians.forEach((g) => {
      addEmail(g.email);
      addPhone(g.phone);
    });

    const links = await prisma.studentLink.findMany({
      where: { schoolId },
      include: { user: { select: { email: true } } },
    });
    links.forEach((l) => addEmail(l.user?.email));

    return { emails: Array.from(emails), phones: Array.from(phones) };
  }

  if (targets.audienceType === 'role') {
    if (targets.targetRoles?.length) {
      const memberships = await prisma.schoolMembership.findMany({
        where: { schoolId, role: { in: targets.targetRoles } },
        include: { user: { select: { email: true } } },
      });
      memberships.forEach((m) => addEmail(m.user?.email));
    }
  }

  if (targets.audienceType === 'class' || targets.audienceType === 'section' || targets.audienceType === 'individual') {
    let students = [];

    if (targets.audienceType === 'class') {
      students = await prisma.student.findMany({
        where: { schoolId, classId: { in: targets.targetClassIds || [] }, isArchived: false },
        select: { id: true, guardianId: true },
      });
    }

    if (targets.audienceType === 'section') {
      students = await prisma.student.findMany({
        where: { schoolId, sectionId: { in: targets.targetSectionIds || [] }, isArchived: false },
        select: { id: true, guardianId: true },
      });
    }

    if (targets.audienceType === 'individual') {
      students = await prisma.student.findMany({
        where: { schoolId, id: { in: targets.targetStudentIds || [] }, isArchived: false },
        select: { id: true, guardianId: true },
      });
    }

    if (students.length) {
      const guardianIds = Array.from(new Set(students.map((s) => s.guardianId).filter(Boolean)));
      const guardians = guardianIds.length
        ? await prisma.guardian.findMany({
            where: { schoolId, id: { in: guardianIds }, isArchived: false },
            select: { email: true, phone: true },
          })
        : [];

      guardians.forEach((g) => {
        addEmail(g.email);
        addPhone(g.phone);
      });

      const links = await prisma.studentLink.findMany({
        where: { schoolId, studentId: { in: students.map((s) => s.id) } },
        include: { user: { select: { email: true } } },
      });
      links.forEach((l) => addEmail(l.user?.email));
    }
  }

  return { emails: Array.from(emails), phones: Array.from(phones) };
}

async function enqueueDelivery({ schoolId, record }) {
  if (record.status !== 'sent') return { queued: false, emails: 0, phones: 0 };

  const recipients = await resolveRecipients({ schoolId, record });

  const subjectLine = record.subject || record.title || 'Summit School OS';
  const html = basicTemplate({
    title: subjectLine,
    body: `<p>${String(record.body || '').replaceAll('\n', '<br/>')}</p>`,
  });

  for (const to of recipients.emails) {
    // eslint-disable-next-line no-await-in-loop
    await enqueueEmail('send', { to, subject: subjectLine, html, text: record.body }).catch(() => {});
  }

  const smsBody = `${subjectLine}: ${String(record.body || '').slice(0, 900)}`;
  for (const to of recipients.phones) {
    // eslint-disable-next-line no-await-in-loop
    await enqueueSms('send', { to, body: smsBody }).catch(() => {});
  }

  return { queued: true, emails: recipients.emails.length, phones: recipients.phones.length };
}

// ✅ Teacher restrictions applied here
function assertTeacherCommunicationPolicy({ targets }) {
  const type = targets.audienceType;
  if (type === 'section') return true;
  if (type === 'role') return true;
  throw new AppError('Teachers can only send to Section or to Admin/Principal roles.', 403, 'FORBIDDEN');
}

export async function createCommunication({ schoolId, userId, role, payload }) {
  const targets = normalizeTargets(payload);

  // Base validation
  if (targets.audienceType === 'role' && !targets.targetRoles.length) throw new AppError('Target roles are required.', 400, 'VALIDATION_ERROR');
  if (targets.audienceType === 'class' && !targets.targetClassIds.length) throw new AppError('Target class IDs are required.', 400, 'VALIDATION_ERROR');
  if (targets.audienceType === 'section' && !targets.targetSectionIds.length) throw new AppError('Target section IDs are required.', 400, 'VALIDATION_ERROR');
  if (targets.audienceType === 'individual' && !targets.targetStudentIds.length) throw new AppError('Target student IDs are required.', 400, 'VALIDATION_ERROR');

  // ✅ Teacher policy enforcement
  if (role === 'Teacher') {
    assertTeacherCommunicationPolicy({ targets });

    const scope = await getTeacherScope({ schoolId, userId });
    const allowedSections = new Set(scope.sectionIds);

    if (targets.audienceType === 'section') {
      const bad = (targets.targetSectionIds || []).filter((id) => !allowedSections.has(id));
      if (bad.length) throw new AppError('Teachers can only message their assigned section(s).', 403, 'FORBIDDEN', { sectionIds: bad });
    }

    if (targets.audienceType === 'role') {
      const allowedRoles = new Set(['Admin', 'Principal']);
      const bad = (targets.targetRoles || []).filter((r) => !allowedRoles.has(r));
      if (bad.length) throw new AppError('Teachers can only message Admin/Principal by role.', 403, 'FORBIDDEN', { roles: bad });
    }

    // Forbid school/class/individual explicitly
    if (targets.audienceType === 'school' || targets.audienceType === 'class' || targets.audienceType === 'individual') {
      throw new AppError('Teachers are not allowed to send to this audience type.', 403, 'FORBIDDEN');
    }
  }

  const record = await prisma.communication.create({
    data: {
      schoolId,
      kind: payload.kind === 'announcement' ? 'announcement' : 'message',
      status: payload.status || 'draft',
      priority: payload.priority || 'medium',

      subject: payload.kind === 'message' ? trim(payload.subject) : null,
      title: payload.kind === 'announcement' ? trim(payload.subject) : null,

      body: String(payload.body || ''),

      audienceType: targets.audienceType,

      targetRoles: targets.targetRoles,
      targetClassIds: targets.targetClassIds,
      targetSectionIds: targets.targetSectionIds,
      targetStudentIds: targets.targetStudentIds,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'communication',
    entityId: record.id,
    action: 'created',
    message: `Communication created: ${payload.subject}`,
  });

  const delivery = await enqueueDelivery({ schoolId, record });
  return { record, delivery };
}

export async function updateCommunication({ schoolId, userId, role, id, payload }) {
  const existing = await prisma.communication.findFirst({ where: { id, schoolId, isArchived: false } });
  if (!existing) throw new AppError('Communication not found.', 404, 'NOT_FOUND');

  if (existing.status === 'sent') throw new AppError('Sent communications cannot be edited.', 400, 'VALIDATION_ERROR');

  const next = {
    kind: payload.kind != null ? (payload.kind === 'announcement' ? 'announcement' : 'message') : existing.kind,
    status: payload.status ?? existing.status,
    priority: payload.priority ?? existing.priority,
    subject: payload.subject ?? (existing.subject || existing.title || ''),
    body: payload.body ?? existing.body,

    audienceType: payload.audienceType ?? existing.audienceType,
    targetRoles: payload.targetRoles ?? (existing.targetRoles || []),
    targetClassIds: payload.targetClassIds ?? (existing.targetClassIds || []),
    targetSectionIds: payload.targetSectionIds ?? (existing.targetSectionIds || []),
    targetStudentIds: payload.targetStudentIds ?? (existing.targetStudentIds || []),
  };

  if (next.audienceType === 'role' && !next.targetRoles.length) throw new AppError('Target roles are required.', 400, 'VALIDATION_ERROR');
  if (next.audienceType === 'class' && !next.targetClassIds.length) throw new AppError('Target class IDs are required.', 400, 'VALIDATION_ERROR');
  if (next.audienceType === 'section' && !next.targetSectionIds.length) throw new AppError('Target section IDs are required.', 400, 'VALIDATION_ERROR');
  if (next.audienceType === 'individual' && !next.targetStudentIds.length) throw new AppError('Target student IDs are required.', 400, 'VALIDATION_ERROR');

  // ✅ Teacher policy enforcement on update as well
  if (role === 'Teacher') {
    const targets = normalizeTargets(next);
    assertTeacherCommunicationPolicy({ targets });

    const scope = await getTeacherScope({ schoolId, userId });
    const allowedSections = new Set(scope.sectionIds);

    if (targets.audienceType === 'section') {
      const bad = (targets.targetSectionIds || []).filter((sid) => !allowedSections.has(sid));
      if (bad.length) throw new AppError('Teachers can only message their assigned section(s).', 403, 'FORBIDDEN', { sectionIds: bad });
    }

    if (targets.audienceType === 'role') {
      const allowedRoles = new Set(['Admin', 'Principal']);
      const bad = (targets.targetRoles || []).filter((r) => !allowedRoles.has(r));
      if (bad.length) throw new AppError('Teachers can only message Admin/Principal by role.', 403, 'FORBIDDEN', { roles: bad });
    }

    if (targets.audienceType === 'school' || targets.audienceType === 'class' || targets.audienceType === 'individual') {
      throw new AppError('Teachers are not allowed to send to this audience type.', 403, 'FORBIDDEN');
    }
  }

  const updated = await prisma.communication.update({
    where: { id },
    data: {
      kind: next.kind,
      status: next.status,
      priority: next.priority,

      subject: next.kind === 'message' ? trim(next.subject) : null,
      title: next.kind === 'announcement' ? trim(next.subject) : null,

      body: String(next.body || ''),

      audienceType: next.audienceType,

      targetRoles: next.targetRoles,
      targetClassIds: next.targetClassIds,
      targetSectionIds: next.targetSectionIds,
      targetStudentIds: next.targetStudentIds,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'communication',
    entityId: id,
    action: 'updated',
    message: `Communication updated: ${next.subject}`,
  });

  const delivery = await enqueueDelivery({ schoolId, record: updated });
  return { record: updated, delivery };
}

export async function archiveCommunication({ schoolId, userId, id, reason }) {
  const existing = await prisma.communication.findFirst({ where: { id, schoolId, isArchived: false } });
  if (!existing) throw new AppError('Communication not found.', 404, 'NOT_FOUND');

  const updated = await prisma.communication.update({
    where: { id },
    data: {
      isArchived: true,
      status: 'archived',
      body: reason ? `${existing.body}\n\n[Archived] ${reason}` : existing.body,
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'communication',
    entityId: id,
    action: 'archived',
    message: `Communication archived`,
  });

  return updated;
}