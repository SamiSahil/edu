import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { normalizeEmail, normalizeUsername, trim, lower } from '../../shared/utils/ids.js';

function ensureDev() {
  if (process.env.NODE_ENV === 'production') {
    throw new AppError('Not available in production.', 404, 'NOT_FOUND');
  }
}

/** ---------------------------
 * Small deterministic RNG
 * -------------------------- */
function seededRng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
function pick(rnd, arr) {
  return arr[Math.floor(rnd() * arr.length)];
}
function int(rnd, min, max) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function pad(num, size = 4) {
  return String(num).padStart(size, '0');
}
function ymd(date) {
  return date.toISOString().slice(0, 10);
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function chunkify(arr, size = 1000) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
async function createManyChunked(tx, model, data, chunkSize = 1000) {
  if (!data?.length) return;
  for (const chunk of chunkify(data, chunkSize)) {
    // eslint-disable-next-line no-await-in-loop
    await tx[model].createMany({ data: chunk, skipDuplicates: true });
  }
}

async function upsertUser({ name, email, username, password, role, schoolId }) {
  const emailLower = normalizeEmail(email);
  const usernameLower = normalizeUsername(username);

  let user = await prisma.user.findUnique({ where: { emailLower } });

  if (!user) {
    const passwordHash = await argon2.hash(password);
    user = await prisma.user.create({
      data: {
        name: trim(name),
        email: trim(email),
        emailLower,
        username: trim(username),
        usernameLower,
        passwordHash,
      },
    });
  }

  await prisma.schoolMembership.upsert({
    where: { schoolId_userId: { schoolId, userId: user.id } },
    create: { schoolId, userId: user.id, role },
    update: { role },
  });

  return user;
}

/**
 * Deletes all school-scoped data so you can re-seed without FK issues.
 * Does NOT delete the school or global users.
 */
async function wipeSchoolData({ schoolId }) {
  await prisma.$transaction(async (tx) => {
    await tx.mark.deleteMany({ where: { schoolId } });
    await tx.examSubject.deleteMany({ where: { schoolId } });
    await tx.exam.deleteMany({ where: { schoolId } });

    await tx.payment.deleteMany({ where: { schoolId } });
    await tx.invoiceItem.deleteMany({ where: { schoolId } });
    await tx.invoice.deleteMany({ where: { schoolId } });

    await tx.feeHead.deleteMany({ where: { schoolId } });
    await tx.feeStructure.deleteMany({ where: { schoolId } });

    await tx.attendanceRecord.deleteMany({ where: { schoolId } });
    await tx.assignment.deleteMany({ where: { schoolId } });

    await tx.communication.deleteMany({ where: { schoolId } });

    await tx.libraryIssue.deleteMany({ where: { schoolId } });
    await tx.book.deleteMany({ where: { schoolId } });

    await tx.transportAssignment.deleteMany({ where: { schoolId } });
    await tx.route.deleteMany({ where: { schoolId } });
    await tx.vehicle.deleteMany({ where: { schoolId } });

    await tx.timetableEntry.deleteMany({ where: { schoolId } });

    await tx.studentLink.deleteMany({ where: { schoolId } });
    await tx.student.deleteMany({ where: { schoolId } });
    await tx.guardian.deleteMany({ where: { schoolId } });

    await tx.section.deleteMany({ where: { schoolId } });
    await tx.class.deleteMany({ where: { schoolId } });

    await tx.subjectOnClass.deleteMany({ where: { schoolId } });
    await tx.subject.deleteMany({ where: { schoolId } });

    await tx.staff.deleteMany({ where: { schoolId } });

    await tx.auditLog.deleteMany({ where: { schoolId } });
    await tx.notification.deleteMany({ where: { schoolId } });
    await tx.file.deleteMany({ where: { schoolId } });

    await tx.admission.deleteMany({ where: { schoolId } });

    await tx.counter.deleteMany({ where: { schoolId } });
  });
}

/** ---------------------------
 * SMALL seed (keeps your demo minimal)
 * -------------------------- */
async function seedSmall({ schoolId }) {
  const existingStudents = await prisma.student.count({ where: { schoolId } });
  if (existingStudents > 0) {
    return { seeded: false, message: 'School already has data. Seed skipped.' };
  }

  const staffIds = {
    principal: randomUUID(),
    teacher1: randomUUID(),
    teacher2: randomUUID(),
    accountant: randomUUID(),
    librarian: randomUUID(),
  };

  await prisma.staff.createMany({
    data: [
      { id: staffIds.principal, schoolId, name: 'Avery Stone', roleLabel: 'Principal', department: 'Leadership', email: 'avery.stone@school.test', phone: '+1 202 555 0101', joinDate: new Date('2023-06-01'), status: 'active' },
      { id: staffIds.teacher1, schoolId, name: 'Jordan Ellis', roleLabel: 'Teacher', department: 'Primary', email: 'jordan.ellis@school.test', phone: '+1 202 555 0102', joinDate: new Date('2023-07-01'), status: 'active' },
      { id: staffIds.teacher2, schoolId, name: 'Sofia Khan', roleLabel: 'Teacher', department: 'Primary', email: 'sofia.khan@school.test', phone: '+1 202 555 0103', joinDate: new Date('2023-08-01'), status: 'active' },
      { id: staffIds.accountant, schoolId, name: 'Ethan Cole', roleLabel: 'Accountant', department: 'Finance', email: 'ethan.cole@school.test', phone: '+1 202 555 0104', joinDate: new Date('2023-09-01'), status: 'active' },
      { id: staffIds.librarian, schoolId, name: 'Nora Singh', roleLabel: 'Librarian', department: 'Library', email: 'nora.singh@school.test', phone: '+1 202 555 0105', joinDate: new Date('2023-10-01'), status: 'active' },
    ],
    skipDuplicates: true,
  });

  const clsId = randomUUID();
  const secId = randomUUID();

  await prisma.class.create({
    data: { id: clsId, schoolId, name: 'Grade 1', code: 'G1', order: 3, classTeacherStaffId: staffIds.teacher1 },
  });
  await prisma.section.create({ data: { id: secId, schoolId, classId: clsId, name: 'A', capacity: 32 } });

  const guardianId = randomUUID();
  await prisma.guardian.create({
    data: { id: guardianId, schoolId, name: 'Noah Turner', phone: '+1 202 555 0142', email: 'noah.turner@example.com', relation: 'Father' },
  });

  const year = new Date().getFullYear();
  const studentId = randomUUID();
  await prisma.student.create({
    data: {
      id: studentId,
      schoolId,
      fullName: 'Liam Hart',
      admissionNo: `ADM-${year}-0001`,
      admissionNoLower: `adm-${year}-0001`,
      gender: 'male',
      dob: new Date('2017-03-14'),
      classId: clsId,
      sectionId: secId,
      guardianId,
      admissionDate: new Date(),
      admissionYear: year,
      phone: '+1 202 555 1111',
      email: 'liam.hart@example.com',
      status: 'active',
    },
  });

  await upsertUser({ name: 'Admin', email: 'admin@school.test', username: 'admin', password: 'password123', role: 'Admin', schoolId });

  await prisma.counter.upsert({
    where: { schoolId_key_year: { schoolId, key: 'admissionNo', year } },
    create: { id: randomUUID(), schoolId, key: 'admissionNo', year, lastNumber: 1 },
    update: { lastNumber: 1 },
  });

  return { seeded: true, message: 'Small seed completed.', counts: { students: 1, staff: 5, guardians: 1 } };
}

/** ---------------------------
 * K12 seed (Nursery..Grade12) ~5000+ rows
 * -------------------------- */
async function seedK12({ schoolId }) {
  const rnd = seededRng(202604);

  const year = new Date().getFullYear();

  // Requested sizing (tuned to ~5000+ total records)
  const staffTotal = 180;
  const teacherTotal = 120;
  const guardianTotal = 300;
  const studentTotal = 600;

  const attendanceDays = 3; // 600*3 = 1800
  const invoiceTotal = 120;
  const assignmentTotal = 60;
  const communicationsTotal = 20;

  const booksTotal = 40;
  const issuesTotal = 50;

  const routesTotal = 4;
  const vehiclesTotal = 6;
  const transportAssignmentsTotal = 80;

  const examsTotal = 4;
  const examSubjectsCount = 5;
  const marksStudentsPerExam = 30; // 30*5*4=600 marks

  const periods = [1, 2, 3, 4, 5, 6];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const FIRST = ['Ava', 'Mia', 'Liam', 'Noah', 'Emma', 'Olivia', 'Ethan', 'James', 'Sophia', 'Isla', 'Amir', 'Zara', 'Leo', 'Ivy', 'Aria', 'Nina', 'Owen', 'Kai', 'Ella', 'Sara'];
  const LAST = ['Stone', 'Carter', 'Ellis', 'Khan', 'Cole', 'Singh', 'Rivera', 'Turner', 'Chen', 'Lopez', 'Kim', 'Patel', 'Reed', 'Bennett', 'Brooks', 'Gray', 'Howard', 'Morgan'];
  const DEPTS = ['Primary', 'Secondary', 'Early Years', 'Science', 'Mathematics', 'Languages', 'Admin', 'Finance', 'Library', 'Operations', 'Sports'];

  // 1) STAFF
  const staff = [];
  for (let i = 0; i < staffTotal; i += 1) {
    const id = randomUUID();
    const roleLabel =
      i < teacherTotal ? 'Teacher'
      : i < teacherTotal + 6 ? 'Principal'
      : i < teacherTotal + 18 ? 'Accountant'
      : i < teacherTotal + 28 ? 'Librarian'
      : 'Admin';

    const first = pick(rnd, FIRST);
    const last = pick(rnd, LAST);
    const name = `${first} ${last}`;

    staff.push({
      id,
      schoolId,
      name,
      roleLabel,
      department: pick(rnd, DEPTS),
      email: `${lower(first)}.${lower(last)}.${i}@k12.staff.seed`,
      phone: `+1 222 ${pad(1000 + i, 4)} ${pad(2000 + i, 4)}`,
      joinDate: monthsAgo(int(rnd, 1, 60)),
      status: 'active',
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const teacherPool = staff.filter((s) => s.roleLabel === 'Teacher');

  // 2) CLASSES (Nursery, KG, Grade 1..12)
  const classes = [];
  const classSpecs = [
    { name: 'Nursery', code: 'NUR' },
    { name: 'Kindergarten', code: 'KG' },
    ...Array.from({ length: 12 }, (_, i) => ({ name: `Grade ${i + 1}`, code: `G${i + 1}` })),
  ];

  for (let i = 0; i < classSpecs.length; i += 1) {
    const spec = classSpecs[i];
    classes.push({
      id: randomUUID(),
      schoolId,
      name: spec.name,
      code: spec.code,
      order: i + 1,
      classTeacherStaffId: teacherPool[i % teacherPool.length]?.id || null,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 3) SECTIONS (A/B per class)
  const sections = [];
  const sectionNames = ['A', 'B'];
  for (const cls of classes) {
    for (let j = 0; j < sectionNames.length; j += 1) {
      sections.push({
        id: randomUUID(),
        schoolId,
        classId: cls.id,
        name: sectionNames[j],
        capacity: cls.code === 'NUR' || cls.code === 'KG' ? 30 : 40,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // 4) GUARDIANS
  const guardians = [];
  for (let i = 0; i < guardianTotal; i += 1) {
    const id = randomUUID();
    const first = pick(rnd, FIRST);
    const last = pick(rnd, LAST);
    guardians.push({
      id,
      schoolId,
      name: `${first} ${last}`,
      phone: `+1 333 6${pad(10000 + i, 5)}`,
      email: `${lower(first)}.${lower(last)}.${i}@k12.guardian.seed`,
      relation: pick(rnd, ['Father', 'Mother', 'Guardian']),
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 5) STUDENTS
  const students = [];
  for (let i = 0; i < studentTotal; i += 1) {
    const id = randomUUID();
    const first = pick(rnd, FIRST);
    const last = pick(rnd, LAST);

    const cls = classes[i % classes.length];
    const sec = sections.filter((s) => s.classId === cls.id)[i % 2];

    const admissionNo = `ADM-${year}-${pad(i + 1, 4)}`;

    students.push({
      id,
      schoolId,
      fullName: `${first} ${last}`,
      admissionNo,
      admissionNoLower: lower(admissionNo),
      gender: pick(rnd, ['male', 'female', 'other']),
      dob: new Date(2010 + (i % 10), int(rnd, 0, 11), int(rnd, 1, 28)),
      classId: cls.id,
      sectionId: sec.id,
      guardianId: guardians[i % guardians.length].id,
      admissionDate: monthsAgo(int(rnd, 0, 24)),
      admissionYear: year,
      phone: `+1 444 5${pad(20000 + i, 5)}`,
      email: `${lower(first)}.${lower(last)}.${i}@k12.student.seed`,
      status: 'active',
      notes: null,
      documents: null,
      avatarFileId: null,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 6) SUBJECTS
  const subjects = [];
  const subjectDefs = [
    { name: 'Mathematics', code: 'MTH', type: 'core' },
    { name: 'English', code: 'ENG', type: 'core' },
    { name: 'Science', code: 'SCI', type: 'core' },
    { name: 'Social Studies', code: 'SOC', type: 'core' },
    { name: 'Computer', code: 'ICT', type: 'core' },
    { name: 'Art', code: 'ART', type: 'elective' },
    { name: 'Music', code: 'MUS', type: 'elective' },
    { name: 'Physical Education', code: 'PE', type: 'core' },
    { name: 'Biology', code: 'BIO', type: 'core' },
    { name: 'Chemistry', code: 'CHE', type: 'core' },
    { name: 'Physics', code: 'PHY', type: 'core' },
    { name: 'History', code: 'HIS', type: 'core' },
    { name: 'Geography', code: 'GEO', type: 'core' },
    { name: 'Economics', code: 'ECO', type: 'elective' },
    { name: 'French', code: 'FRE', type: 'elective' },
    { name: 'Business', code: 'BUS', type: 'elective' },
  ];

  for (let i = 0; i < subjectDefs.length; i += 1) {
    const def = subjectDefs[i];
    subjects.push({
      id: randomUUID(),
      schoolId,
      name: def.name,
      code: def.code,
      type: def.type,
      teacherStaffId: teacherPool[i % teacherPool.length].id,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 7) SUBJECT ON CLASS (core -> all classes, electives -> grades 6-12 only)
  const subjectOnClasses = [];
  const grade6Plus = new Set(classes.filter((c) => c.code.startsWith('G') && Number(c.code.slice(1)) >= 6).map((c) => c.id));

  for (const sub of subjects) {
    for (const cls of classes) {
      const isElective = sub.type === 'elective';
      if (isElective && !grade6Plus.has(cls.id)) continue;

      subjectOnClasses.push({
        id: randomUUID(),
        schoolId,
        subjectId: sub.id,
        classId: cls.id,
      });
    }
  }

  // 8) TIMETABLE (teacher/day/period + room conflict safe)
  // Ensure: for each day+period, each teacher is used at most once across sections.
  const timetable = [];
  const sectionList = sections.slice();
  const slotCountPerWeek = days.length * periods.length;
  const sectionsPerSlot = sectionList.length;

  // Assign unique room per section (no room clashes)
  const roomBySectionId = new Map();
  sectionList.forEach((sec, idx) => roomBySectionId.set(sec.id, `R-${idx + 1}`));

  let slotIndex = 0;
  for (const day of days) {
    for (const period of periods) {
      // pick a consecutive block of teachers so they’re unique for this slot
      const startTeacherIndex = (slotIndex * sectionsPerSlot) % teacherPool.length;

      for (let sIdx = 0; sIdx < sectionList.length; sIdx += 1) {
        const sec = sectionList[sIdx];
        const teacher = teacherPool[(startTeacherIndex + sIdx) % teacherPool.length];

        // pick a subject available to that class
        const clsSubjects = subjectOnClasses
          .filter((soc) => soc.classId === sec.classId)
          .map((soc) => soc.subjectId);

        const subjectId = clsSubjects.length ? clsSubjects[(slotIndex + sIdx) % clsSubjects.length] : subjects[0].id;

        timetable.push({
          id: randomUUID(),
          schoolId,
          classId: sec.classId,
          sectionId: sec.id,
          day,
          period,
          subjectId,
          teacherStaffId: teacher.id,
          room: roomBySectionId.get(sec.id),
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      slotIndex += 1;
    }
  }

  // 9) ATTENDANCE: 3 days
  const attendance = [];
  for (let d = 1; d <= attendanceDays; d += 1) {
    const dateKey = ymd(daysAgo(d));
    for (const st of students) {
      const roll = rnd();
      const status =
        roll < 0.86 ? 'present'
        : roll < 0.91 ? 'late'
        : roll < 0.98 ? 'absent'
        : 'excused';

      attendance.push({
        id: randomUUID(),
        schoolId,
        studentId: st.id,
        sectionId: st.sectionId,
        date: dateKey,
        status,
        markedByUserId: null,
        note: null,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

 // 10) FEES: invoices + items + payments
const invoices = [];
const invoiceItems = [];
const payments = [];
const paymentModes = ['cash', 'card', 'bank'];

for (let i = 0; i < invoiceTotal; i += 1) {
  const invId = randomUUID();
  const st = students[i % students.length];

  const invoiceNo = `INV-${year}-${pad(i + 1, 4)}`;

  const issuedAt = monthsAgo(int(rnd, 0, 3));
  const dueDate = new Date(issuedAt.getTime());
  dueDate.setDate(dueDate.getDate() + 14);

  const items = [
    { label: 'Tuition', amount: 220 + int(rnd, 0, 60) },
    { label: 'Activity', amount: 25 + int(rnd, 0, 15) },
    { label: 'Lab', amount: 15 + int(rnd, 0, 10) },
  ];

  const total = items.reduce((sum, x) => sum + x.amount, 0);

  const paidChance = rnd();
  let paidAmount = 0;

  if (paidChance < 0.35) paidAmount = total;
  else if (paidChance < 0.65) paidAmount = int(rnd, 20, Math.max(20, total - 20));

  const waived = paidChance > 0.96 ? int(rnd, 10, 70) : 0;
  const balance = Math.max(0, total - paidAmount - waived);

  let status = 'unpaid';
  if (waived >= total) status = 'waived';
  else if (balance === 0) status = 'paid';
  else if (paidAmount > 0) status = 'partial';
  else status = 'unpaid';
  if (balance > 0 && dueDate < new Date()) status = 'overdue';

  invoices.push({
    id: invId,
    schoolId,
    studentId: st.id,

    invoiceNo,
    invoiceNoLower: lower(invoiceNo),

    issuedAt,
    dueDate,
    amountPaid: paidAmount,
    waivedAmount: waived,
    status,
    notes: null,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  for (const it of items) {
    invoiceItems.push({
      id: randomUUID(),
      schoolId,
      invoiceId: invId,
      label: it.label,
      amount: it.amount,
    });
  }

  if (paidAmount > 0) {
    payments.push({
      id: randomUUID(),
      schoolId,
      invoiceId: invId,
      studentId: st.id,
      amount: paidAmount,
      mode: pick(rnd, paymentModes),
      paidAt: new Date(),
      receiptRef: `RCPT-${year}-${pad(i + 1, 5)}`,
      recordedByUserId: null,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

  // 11) EXAMS + EXAM SUBJECTS + MARKS
  const exams = [];
  const examSubjects = [];
  const marks = [];

  for (let i = 0; i < examsTotal; i += 1) {
    const examId = randomUUID();
    const cls = classes[(i * 3) % classes.length]; // spread across grades

    exams.push({
      id: examId,
      schoolId,
      name: `Term Assessment ${i + 1}`,
      term: `Term ${(i % 3) + 1}`,
      classId: cls.id,
      status: 'published',
      scheduledFor: monthsAgo(int(rnd, 0, 2)),
      maxMarks: 100,
      isLocked: false,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // pick 5 subjects available for this class
    const clsSubIds = subjectOnClasses.filter((soc) => soc.classId === cls.id).map((soc) => soc.subjectId);
    const subPick = clsSubIds.slice(0, examSubjectsCount);

    for (const subId of subPick) {
      examSubjects.push({
        id: randomUUID(),
        schoolId,
        examId,
        subjectId: subId,
      });
    }

    const classStudents = students.filter((s) => s.classId === cls.id);
    const sample = classStudents.slice(0, Math.min(marksStudentsPerExam, classStudents.length));

    for (const st of sample) {
      for (const subId of subPick) {
        marks.push({
          id: randomUUID(),
          schoolId,
          examId,
          studentId: st.id,
          subjectId: subId,
          marks: int(rnd, 30, 100),
          grade: null,
          remarks: null,
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  // 12) ASSIGNMENTS
  const assignments = [];
  for (let i = 0; i < assignmentTotal; i += 1) {
    const cls = classes[i % classes.length];
    const sec = sections.filter((s) => s.classId === cls.id)[i % 2];

    const clsSubIds = subjectOnClasses.filter((soc) => soc.classId === cls.id).map((soc) => soc.subjectId);
    const subjectId = clsSubIds.length ? clsSubIds[i % clsSubIds.length] : subjects[0].id;

    assignments.push({
      id: randomUUID(),
      schoolId,
      title: `Homework ${i + 1}`,
      classId: cls.id,
      sectionId: sec.id,
      subjectId,
      dueDate: daysAgo(-int(rnd, 1, 21)),
      instructions: 'Complete the worksheet and submit neatly.',
      status: i % 6 === 0 ? 'draft' : 'published',
      createdByUserId: null,
      submissions: int(rnd, 0, 30),
      lateSubmissions: int(rnd, 0, 6),
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 13) COMMUNICATIONS
  const communications = [];
  for (let i = 0; i < communicationsTotal; i += 1) {
    const kind = pick(rnd, ['message', 'announcement']);
    const audienceType = pick(rnd, ['role', 'class', 'section']);

    const targetRoles = audienceType === 'role' ? [pick(rnd, ['Parent', 'Student', 'Teacher'])] : [];
    const targetClassIds = audienceType === 'class' ? [classes[i % classes.length].id] : [];
    const targetSectionIds = audienceType === 'section' ? [sections[i % sections.length].id] : [];

    const title = `School Notice ${i + 1}`;

    communications.push({
      id: randomUUID(),
      schoolId,
      kind,
      status: 'sent',
      priority: pick(rnd, ['low', 'medium', 'high']),
      subject: kind === 'message' ? title : null,
      title: kind === 'announcement' ? title : null,
      body: 'This is seeded communication content for testing.',
      audienceType,
      targetRoles,
      targetClassIds,
      targetSectionIds,
      targetStudentIds: [],
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 14) BOOKS (we’ll adjust availability during issue creation)
  const books = [];
  for (let i = 0; i < booksTotal; i += 1) {
    const copies = int(rnd, 3, 10);
    books.push({
      id: randomUUID(),
      schoolId,
      title: `Book ${i + 1}`,
      author: `${pick(rnd, FIRST)} ${pick(rnd, LAST)}`,
      isbn: `978${year}${pad(i + 1, 7)}`,
      category: pick(rnd, ['Fiction', 'Non-Fiction', 'Science', 'History', 'Kids']),
      copies,
      availableCopies: copies,
      status: 'available',
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 15) TRANSPORT
  const vehicles = [];
  for (let i = 0; i < vehiclesTotal; i += 1) {
    vehicles.push({
      id: randomUUID(),
      schoolId,
      name: `Bus ${i + 1}`,
      plateNo: `K12-${year}-${pad(i + 1, 3)}`,
      capacity: 60,
      status: 'active',
      driverName: `${pick(rnd, FIRST)} ${pick(rnd, LAST)}`,
      routeId: null,
      health: pick(rnd, ['good', 'ok', 'excellent']),
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const routes = [];
  for (let i = 0; i < routesTotal; i += 1) {
    routes.push({
      id: randomUUID(),
      schoolId,
      name: `Route ${i + 1}`,
      startPoint: 'Campus',
      stops: ['Stop A', 'Stop B', 'Stop C', 'Stop D'].slice(0, int(rnd, 2, 4)),
      distanceKm: int(rnd, 6, 30),
      assignedVehicleId: vehicles[i % vehicles.length].id,
      status: 'active',
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // transport assignments: unique students, distributed across vehicles
  const transportAssignments = [];
  for (let i = 0; i < transportAssignmentsTotal; i += 1) {
    const st = students[i]; // first N unique students
    const route = routes[i % routes.length];
    const vehicle = vehicles[i % vehicles.length];

    transportAssignments.push({
      id: randomUUID(),
      schoolId,
      studentId: st.id,
      routeId: route.id,
      vehicleId: vehicle.id,
      pickupStop: Array.isArray(route.stops) ? route.stops[0] : 'Stop A',
      dropStop: 'Campus',
      active: true,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 16) ADMISSIONS
  const admissions = [];
  for (let i = 0; i < 120; i += 1) {
    const cls = classes[int(rnd, 0, classes.length - 1)];
    const applicant = `${pick(rnd, FIRST)} ${pick(rnd, LAST)}`;
    const parent = `${pick(rnd, FIRST)} ${pick(rnd, LAST)}`;
    const phone = `+1 555 8${pad(30000 + i, 5)}`;

    admissions.push({
      id: randomUUID(),
      schoolId,
      applicantName: applicant,
      parentName: parent,
      phone,
      email: `${lower(applicant.split(' ')[0])}.${lower(applicant.split(' ')[1])}.${i}@admission.seed`,
      requestedClassId: cls.id,
      source: pick(rnd, ['Website', 'Walk-in', 'Referral', 'Social']),
      previousSchool: rnd() < 0.4 ? `School ${int(rnd, 1, 50)}` : null,
      status: pick(rnd, ['new', 'contacted', 'shortlisted', 'approved', 'rejected']),
      notes: null,
      convertedStudentId: null,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Admission number counter
  const admissionCounter = {
    id: randomUUID(),
    schoolId,
    key: 'admissionNo',
    year,
    lastNumber: studentTotal,
  };

  // Write main data in one big transaction (chunked)
  await prisma.$transaction(async (tx) => {
    await createManyChunked(tx, 'staff', staff, 500);
    await createManyChunked(tx, 'class', classes, 200);
    await createManyChunked(tx, 'section', sections, 500);
    await createManyChunked(tx, 'guardian', guardians, 500);
    await createManyChunked(tx, 'student', students, 500);

    await createManyChunked(tx, 'subject', subjects, 200);
    await createManyChunked(tx, 'subjectOnClass', subjectOnClasses, 800);

    await createManyChunked(tx, 'timetableEntry', timetable, 1000);
    await createManyChunked(tx, 'attendanceRecord', attendance, 1000);

    await createManyChunked(tx, 'invoice', invoices, 500);
    await createManyChunked(tx, 'invoiceItem', invoiceItems, 1000);
    await createManyChunked(tx, 'payment', payments, 500);

    await createManyChunked(tx, 'exam', exams, 50);
    await createManyChunked(tx, 'examSubject', examSubjects, 500);
    await createManyChunked(tx, 'mark', marks, 1000);

    await createManyChunked(tx, 'assignment', assignments, 500);
    await createManyChunked(tx, 'communication', communications, 200);

    await createManyChunked(tx, 'book', books, 500);

    await createManyChunked(tx, 'vehicle', vehicles, 200);
    await createManyChunked(tx, 'route', routes, 200);
    await createManyChunked(tx, 'transportAssignment', transportAssignments, 500);

    await createManyChunked(tx, 'admission', admissions, 500);

    await tx.counter.upsert({
    where: { schoolId_key_year: { schoolId, key: 'invoiceNo', year } },
    create: { id: randomUUID(), schoolId, key: 'invoiceNo', year, lastNumber: invoiceTotal },
    update: { lastNumber: invoiceTotal },
   });
  });

  // Create library issues + update availableCopies like the real workflow (small loops)
  // (we do it after main createMany for correctness)
  const bookRows = await prisma.book.findMany({
    where: { schoolId, isArchived: false },
    select: { id: true, copies: true, availableCopies: true },
    orderBy: { createdAt: 'asc' },
  });

  const issues = [];
  for (let i = 0; i < issuesTotal; i += 1) {
    const st = students[(i * 7) % students.length];
    const book = bookRows[i % bookRows.length];

    // Only issue if copies are available
    if (book.availableCopies <= 0) continue;

    // create issue
    issues.push({
      id: randomUUID(),
      schoolId,
      bookId: book.id,
      studentId: st.id,
      issuedAt: daysAgo(int(rnd, 2, 30)),
      dueDate: daysAgo(int(rnd, -2, 14)),
      returnedAt: rnd() < 0.55 ? new Date() : null,
      fine: rnd() < 0.2 ? int(rnd, 1, 10) : 0,
      status: 'issued',
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // decrement availableCopies locally
    book.availableCopies -= 1;
  }

  await prisma.$transaction(async (tx) => {
    await createManyChunked(tx, 'libraryIssue', issues, 200);

    // update books availability
    for (const b of bookRows) {
      // eslint-disable-next-line no-await-in-loop
      await tx.book.update({
        where: { id: b.id },
        data: {
          availableCopies: Math.max(0, b.availableCopies),
          status: b.availableCopies > 0 ? 'available' : 'issued',
        },
      });
    }
  });

  // Create a few demo users to test role-based views
  const admin = await upsertUser({
    name: 'K12 Admin',
    email: `k12.admin.${schoolId}@seed.local`,
    username: `k12_admin_${schoolId.slice(0, 6)}`,
    password: 'password123',
    role: 'Admin',
    schoolId,
  });

  const teacherUser = await upsertUser({
    name: 'K12 Teacher',
    email: `k12.teacher.${schoolId}@seed.local`,
    username: `k12_teacher_${schoolId.slice(0, 6)}`,
    password: 'password123',
    role: 'Teacher',
    schoolId,
  });

  const accountantUser = await upsertUser({
    name: 'K12 Accountant',
    email: `k12.accountant.${schoolId}@seed.local`,
    username: `k12_accountant_${schoolId.slice(0, 6)}`,
    password: 'password123',
    role: 'Accountant',
    schoolId,
  });

  const librarianUser = await upsertUser({
    name: 'K12 Librarian',
    email: `k12.librarian.${schoolId}@seed.local`,
    username: `k12_librarian_${schoolId.slice(0, 6)}`,
    password: 'password123',
    role: 'Librarian',
    schoolId,
  });

  const parentUser = await upsertUser({
    name: 'K12 Parent',
    email: `k12.parent.${schoolId}@seed.local`,
    username: `k12_parent_${schoolId.slice(0, 6)}`,
    password: 'password123',
    role: 'Parent',
    schoolId,
  });

  const studentUser = await upsertUser({
    name: 'K12 Student',
    email: `k12.student.${schoolId}@seed.local`,
    username: `k12_student_${schoolId.slice(0, 6)}`,
    password: 'password123',
    role: 'Student',
    schoolId,
  });

  // link parent/student users to the first seeded student record
  await prisma.studentLink.createMany({
    data: [
      { id: randomUUID(), schoolId, userId: parentUser.id, studentId: students[0].id, role: 'Parent' },
      { id: randomUUID(), schoolId, userId: studentUser.id, studentId: students[0].id, role: 'Student' },
    ],
    skipDuplicates: true,
  });

  return {
    seeded: true,
    message: 'K12 seed completed (Nursery → Grade 12).',
    totals: {
      classes: classes.length,
      sections: sections.length,
      staff: staff.length,
      teachers: teacherTotal,
      guardians: guardians.length,
      students: students.length,
      subjects: subjects.length,
      subjectOnClass: subjectOnClasses.length,
      timetableEntries: timetable.length,
      attendanceRecords: attendance.length,
      invoices: invoices.length,
      invoiceItems: invoiceItems.length,
      payments: payments.length,
      exams: exams.length,
      examSubjects: examSubjects.length,
      marks: marks.length,
      assignments: assignments.length,
      communications: communications.length,
      books: books.length,
      libraryIssues: issues.length,
      vehicles: vehicles.length,
      routes: routes.length,
      transportAssignments: transportAssignments.length,
      admissions: admissions.length,
    },
    demoUsers: [
      { role: 'Admin', identity: admin.email, password: 'password123' },
      { role: 'Teacher', identity: teacherUser.email, password: 'password123' },
      { role: 'Accountant', identity: accountantUser.email, password: 'password123' },
      { role: 'Librarian', identity: librarianUser.email, password: 'password123' },
      { role: 'Parent', identity: parentUser.email, password: 'password123' },
      { role: 'Student', identity: studentUser.email, password: 'password123' },
    ],
  };
}

/** ---------------------------
 * Public entry
 * -------------------------- */
export async function seedCurrentSchool({ schoolId, options = { mode: 'small', force: false } }) {
  ensureDev();

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new AppError('School not found.', 404, 'NOT_FOUND');

  const mode = String(options?.mode || 'small').toLowerCase();
  const force = Boolean(options?.force || false);

  if (force) {
    await wipeSchoolData({ schoolId });
  } else {
    const existingStudents = await prisma.student.count({ where: { schoolId } });
    if (existingStudents > 0) {
      return { seeded: false, message: 'School already has data. Seed skipped. Use {force:true} to wipe & reseed.' };
    }
  }

  if (mode === 'k12') {
    return seedK12({ schoolId });
  }

  return seedSmall({ schoolId });
}