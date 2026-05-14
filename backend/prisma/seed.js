import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

const uid = () => randomUUID();
const lower = (v) => String(v ?? '').trim().toLowerCase();
const pad = (n, size = 6) => String(n).padStart(size, '0');

function pickWeightedIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

async function createManyBatched(model, data, batchSize = 2000, opts = {}) {
  for (let i = 0; i < data.length; i += batchSize) {
    // eslint-disable-next-line no-await-in-loop
    await model.createMany({ data: data.slice(i, i + batchSize), ...opts });
  }
}

function toYmd(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? new Date().toISOString().slice(0, 10) : dt.toISOString().slice(0, 10);
}

function monthDates(monthKey, count = 8) {
  // monthKey: YYYY-MM
  const [yy, mm] = String(monthKey).split('-').map(Number);
  const base = new Date(Date.UTC(yy, (mm || 1) - 1, 1));
  const daysInMonth = new Date(Date.UTC(yy, mm || 1, 0)).getUTCDate();

  const picks = new Set();
  while (picks.size < Math.min(count, daysInMonth)) {
    picks.add(1 + Math.floor(Math.random() * daysInMonth));
  }
  return Array.from(picks).sort((a, b) => a - b).map((day) => {
    const d = new Date(Date.UTC(yy, (mm || 1) - 1, day));
    return toYmd(d);
  });
}

async function main() {
  faker.seed(Number(process.env.SEED_FAKER_SEED || 42));

  const SCALE = Number(process.env.SEED_SCALE || 10);
  const PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'password123';

  // “10×” relative to your original:
  const TEACHERS = 100 * SCALE;       // 1500
  const STUDENTS = 100 * SCALE;      // 24000  -> +24000 Parent users +24000 Student users
  const SUBJECTS = 20 * SCALE;        // 100
  const ASSIGNMENTS = 20 * SCALE;     // 100
  const EXAMS = 6 * SCALE;            // 40
  const COMMUNICATIONS = 10 * SCALE;  // 100
  const BOOKS = 60 * SCALE;           // 500
  const ISSUES = 80 * SCALE;          // 800
  const ADMISSIONS = 200 * SCALE;     // 2000
  const ROUTES = 8 * SCALE;           // 50
  const VEHICLES = 8 * SCALE;         // 50
  const TRANSPORT_ASSIGNMENTS = 200 * SCALE; // 2000

  // Timetable size is school-structural, not scaled (it should remain realistic)
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const PERIODS = [1, 2, 3, 4, 5, 6];

  console.log(`Seeding: SCALE=${SCALE}`);
  console.log(`Default test password for ALL seeded accounts: ${PASSWORD}`);

  const start = Date.now();
  const passwordHash = await argon2.hash(PASSWORD);

  // 1) School
  const school = await prisma.school.create({
    data: {
      name: `Summit International Academy (Seed x${SCALE})`,
      email: 'contact@summitacademy.edu',
      phone: '+15550192834',
      address: '742 Evergreen Terrace, Summit City',
      motto: 'Reaching the Peak of Excellence',
      logoUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150',
    },
  });
  const schoolId = school.id;

  // 2) Classes + Sections
  const classes = [];
  const sections = [];

  const classNames = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);
  const sectionNames = ['Section A', 'Section B', 'Section C', 'Section D', 'Section E', 'Section F', 'Section G','Section H','Section I','Section J'];

  for (let i = 0; i < classNames.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    const cls = await prisma.class.create({
      data: {
        schoolId,
        name: classNames[i],
        code: `G${i + 1}`,
        order: i + 1,
      },
    });
    classes.push(cls);

    for (const secName of sectionNames) {
      // eslint-disable-next-line no-await-in-loop
      const sec = await prisma.section.create({
        data: {
          schoolId,
          classId: cls.id,
          name: secName,
          capacity: 35,
        },
      });
      sections.push(sec);
    }
  }

  const sectionsByClass = new Map();
  for (const sec of sections) {
    if (!sectionsByClass.has(sec.classId)) sectionsByClass.set(sec.classId, []);
    sectionsByClass.get(sec.classId).push(sec);
  }

  // 3) Core fixed logins (easy to test)
  const core = [
    { role: 'Admin', username: 'admin', email: 'admin@summitacademy.edu', dept: 'Administration' },
    { role: 'Principal', username: 'principal', email: 'principal@summitacademy.edu', dept: 'Administration' },
    { role: 'Accountant', username: 'accountant', email: 'accountant@summitacademy.edu', dept: 'Finance' },
    { role: 'Librarian', username: 'librarian', email: 'librarian@summitacademy.edu', dept: 'Library' },
  ];

  const coreUserIds = {};
  const coreStaffIds = {};

  for (const c of core) {
    // eslint-disable-next-line no-await-in-loop
    const user = await prisma.user.create({
      data: {
        name: `${c.role} User`,
        email: c.email,
        emailLower: lower(c.email),
        username: c.username,
        usernameLower: lower(c.username),
        passwordHash,
        isActive: true,
      },
    });
    coreUserIds[c.role] = user.id;

    // eslint-disable-next-line no-await-in-loop
    await prisma.schoolMembership.create({ data: { schoolId, userId: user.id, role: c.role } });

    // eslint-disable-next-line no-await-in-loop
    const staff = await prisma.staff.create({
      data: {
        schoolId,
        name: `${c.role} User`,
        roleLabel: c.role,
        department: c.dept,
        email: c.email,
        phone: `+1555${String(1000000 + Math.floor(Math.random() * 8999999)).slice(-7)}`,
        joinDate: faker.date.past({ years: 6 }),
        status: 'active',
        isArchived: false,
        userId: user.id,
      },
    });
    coreStaffIds[c.role] = staff.id;
  }

  // 4) Teachers (User + Membership + Staff) in batches
  console.log(`Creating teachers: ${TEACHERS}`);
  const teacherUsers = [];
  const teacherMemberships = [];
  const teacherStaff = [];

  const teacherUserIds = [];
  const teacherStaffIds = [];

  for (let i = 1; i <= TEACHERS; i++) {
    const userId = uid();
    const staffId = uid();

    const email = `teacher${pad(i, 5)}@summitacademy.edu`;
    const username = `teacher${pad(i, 5)}`;
    const name = `${faker.person.firstName()} ${faker.person.lastName()}`;

    teacherUsers.push({
      id: userId,
      name,
      email,
      emailLower: lower(email),
      username,
      usernameLower: lower(username),
      passwordHash,
      isActive: true,
    });

    teacherMemberships.push({
      id: uid(),
      schoolId,
      userId,
      role: 'Teacher',
    });

    teacherStaff.push({
      id: staffId,
      schoolId,
      name,
      roleLabel: 'Teacher',
      department: 'Academic Faculty',
      email,
      phone: `+1555${String(2000000 + i).slice(-7)}`,
      joinDate: faker.date.past({ years: 10 }),
      status: 'active',
      isArchived: false,
      userId,
    });

    teacherUserIds.push(userId);
    teacherStaffIds.push(staffId);
  }

  await createManyBatched(prisma.user, teacherUsers, 2000);
  await createManyBatched(prisma.schoolMembership, teacherMemberships, 2000);
  await createManyBatched(prisma.staff, teacherStaff, 2000);

  // Assign one class teacher per class
  for (let i = 0; i < classes.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.class.update({
      where: { id: classes[i].id },
      data: { classTeacherStaffId: teacherStaffIds[i] || null },
    });
  }

  // 5) Subjects + SubjectOnClass mappings (realistic coverage)
  console.log(`Creating subjects: ${SUBJECTS}`);

  const baseSubjects = [
    { name: 'Mathematics', type: 'core' },
    { name: 'English', type: 'core' },
    { name: 'Science', type: 'core' },
    { name: 'Social Studies', type: 'core' },
    { name: 'Computer Science', type: 'core' },
    { name: 'Physical Education', type: 'core' },
    { name: 'Art', type: 'elective' },
    { name: 'Music', type: 'elective' },
    { name: 'Drama', type: 'elective' },
    { name: 'Robotics', type: 'elective' },
    { name: 'History', type: 'elective' },
    { name: 'Geography', type: 'elective' },
    { name: 'Biology', type: 'elective' },
    { name: 'Chemistry', type: 'elective' },
    { name: 'Physics', type: 'elective' },
    { name: 'Economics', type: 'elective' },
    { name: 'Accounting', type: 'elective' },
    { name: 'Business Studies', type: 'elective' },
    { name: 'Philosophy', type: 'elective' },
    { name: 'Literature', type: 'elective' },
    { name: 'Foreign Language', type: 'elective' },
    { name: 'Health', type: 'elective' },

  ];

  const subjects = [];
  const subjectOnClass = [];
  const subjectIds = [];

  // Build class grade index (1..12)
  const classGradeIndex = new Map(classes.map((c) => [c.id, Number(c.code.replace('G', '')) || 1]));

  for (let i = 1; i <= SUBJECTS; i++) {
    const sId = uid();
    subjectIds.push(sId);

    const base = baseSubjects[(i - 1) % baseSubjects.length];
    const name = `${base.name}${SUBJECTS > baseSubjects.length ? ` ${i}` : ''}`;
    const teacherStaffId = teacherStaffIds[(i - 1) % teacherStaffIds.length];

    subjects.push({
      id: sId,
      schoolId,
      name,
      code: `SUB-${pad(i, 4)}`,
      type: base.type,
      teacherStaffId,
      isArchived: false,
    });
  }

  // Map subjects to classes:
  // - core: all grades
  // - elective: grades 6..12
  for (const cls of classes) {
    const grade = classGradeIndex.get(cls.id) || 1;
    for (let i = 0; i < subjects.length; i++) {
      const s = subjects[i];
      const electiveAllowed = grade >= 6;
      if (s.type === 'core' || electiveAllowed) {
        subjectOnClass.push({
          id: uid(),
          schoolId,
          subjectId: s.id,
          classId: cls.id,
        });
      }
    }
  }

  await createManyBatched(prisma.subject, subjects, 2000);
  await createManyBatched(prisma.subjectOnClass, subjectOnClass, 4000, { skipDuplicates: true });

  // Build lookup map classId -> subjectIds
  const classToSubjectIds = new Map();
  for (const cls of classes) classToSubjectIds.set(cls.id, []);
  for (const row of subjectOnClass) {
    classToSubjectIds.get(row.classId).push(row.subjectId);
  }

  // 6) Timetable (collision-free)
  console.log(`Creating timetable entries for ${sections.length} sections (no collisions)...`);
  const timetable = [];
  const teacherBusy = new Map(); // key day-period -> Set(teacherStaffId)
  const slotCursor = new Map();  // key day-period -> next teacher index

  const getBusySet = (day, period) => {
    const k = `${day}-${period}`;
    if (!teacherBusy.has(k)) teacherBusy.set(k, new Set());
    return teacherBusy.get(k);
  };

  const pickFreeTeacher = (day, period) => {
    const k = `${day}-${period}`;
    const busy = getBusySet(day, period);

    let cur = slotCursor.get(k) || 0;
    for (let tries = 0; tries < teacherStaffIds.length; tries++) {
      const t = teacherStaffIds[cur % teacherStaffIds.length];
      cur += 1;
      if (!busy.has(t)) {
        busy.add(t);
        slotCursor.set(k, cur);
        return t;
      }
    }
    throw new Error(`Not enough teachers to schedule slot ${k}`);
  };

  for (const sec of sections) {
    const cls = classes.find((c) => c.id === sec.classId);
    const classSubjects = classToSubjectIds.get(sec.classId) || subjectIds;

    // simple rotation for variety
    let rot = 0;

    for (const day of DAYS) {
      for (const period of PERIODS) {
        const subjectId = classSubjects[(rot + period) % classSubjects.length];
        const teacherStaffId = pickFreeTeacher(day, period);

        timetable.push({
          id: uid(),
          schoolId,
          classId: sec.classId,
          sectionId: sec.id,
          day,
          period,
          subjectId,
          teacherStaffId,
          room: null,       // keep null -> no room collision checks
          isArchived: false,
        });
      }
      rot += 3;
    }
  }

  await createManyBatched(prisma.timetableEntry, timetable, 5000);

  // 7) Fee structures + fee heads (one per class)
  console.log('Creating fee structures...');
  for (const cls of classes) {
    // eslint-disable-next-line no-await-in-loop
    const fs = await prisma.feeStructure.create({
      data: {
        schoolId,
        name: `${cls.name} Monthly Fee Structure`,
        classId: cls.id,
        period: 'monthly',
        active: true,
        isArchived: false,
      },
    });

    // eslint-disable-next-line no-await-in-loop
    await prisma.feeHead.createMany({
      data: [
        { id: uid(), schoolId, feeStructureId: fs.id, label: 'Tuition', amount: 500 + (cls.order * 10) },
        { id: uid(), schoolId, feeStructureId: fs.id, label: 'Transport', amount: 80 },
        { id: uid(), schoolId, feeStructureId: fs.id, label: 'Library', amount: 20 },
      ],
    });
  }

  // 8) Students + guardians + parent/student users + links + finance + attendance (realistic distribution)
  console.log(`Creating students + users: students=${STUDENTS} (and parents=${STUDENTS}) ...`);

  // Realistic grade weights: more in lower grades
  const gradeWeights = [1.8, 1.75, 1.65, 1.55, 1.45, 1.35, 1.2, 1.1, 1.0, 0.95, 0.9, 0.85];

  // Sections distribution within a class (A most common)
  const sectionWeights = [0.40, 0.30, 0.20, 0.10];

  const classIds = classes.map((c) => c.id);
  const studentsByClass = new Map(classIds.map((id) => [id, []])); // classId -> studentIds
  const allStudentIds = [];

  const monthKey = new Date().toISOString().slice(0, 7);
  const attDays = monthDates(monthKey, Number(process.env.SEED_ATTENDANCE_DAYS || 8));

  const BATCH = Number(process.env.SEED_BATCH_SIZE || 500);

  for (let startIdx = 1; startIdx <= STUDENTS; startIdx += BATCH) {
    const endIdx = Math.min(STUDENTS, startIdx + BATCH - 1);

    const guardians = [];
    const users = [];
    const memberships = [];
    const students = [];
    const links = [];
    const invoices = [];
    const invoiceItems = [];
    const payments = [];
    const attendance = [];

    for (let i = startIdx; i <= endIdx; i++) {
      const guardianId = uid();
      const parentUserId = uid();
      const studentUserId = uid();
      const studentId = uid();

      const gradeIndex = pickWeightedIndex(gradeWeights); // 0..11
      const classId = classIds[gradeIndex];

      const secs = sectionsByClass.get(classId) || [];
      const secIndex = pickWeightedIndex(sectionWeights);
      const sec = secs[Math.min(secIndex, secs.length - 1)] || secs[0];

      const stuFirst = faker.person.firstName();
      const stuLast = faker.person.lastName();
      const parentFirst = faker.person.firstName();

      const parentEmail = `parent${pad(i, 6)}@summitfamilies.test`;
      const studentEmail = `student${pad(i, 6)}@summitstudents.test`;

      const guardianPhone = `+1555${String(3000000 + i).slice(-7)}`;

      guardians.push({
        id: guardianId,
        schoolId,
        name: `${parentFirst} ${stuLast}`,
        phone: guardianPhone,
        email: parentEmail,
        relation: 'Parent',
        isArchived: false,
      });

      users.push(
        {
          id: parentUserId,
          name: `${parentFirst} ${stuLast}`,
          email: parentEmail,
          emailLower: lower(parentEmail),
          username: `parent_${pad(i, 6)}`,
          usernameLower: lower(`parent_${pad(i, 6)}`),
          passwordHash,
          isActive: true,
        },
        {
          id: studentUserId,
          name: `${stuFirst} ${stuLast}`,
          email: studentEmail,
          emailLower: lower(studentEmail),
          username: `student_${pad(i, 6)}`,
          usernameLower: lower(`student_${pad(i, 6)}`),
          passwordHash,
          isActive: true,
        }
      );

      memberships.push(
        { id: uid(), schoolId, userId: parentUserId, role: 'Parent' },
        { id: uid(), schoolId, userId: studentUserId, role: 'Student' }
      );

      const admissionNo = `ADM-${new Date().getFullYear()}-${pad(i, 5)}`;

      students.push({
        id: studentId,
        schoolId,
        fullName: `${stuFirst} ${stuLast}`,
        admissionNo,
        admissionNoLower: lower(admissionNo),
        gender: Math.random() < 0.48 ? 'male' : Math.random() < 0.96 ? 'female' : 'other',
        dob: faker.date.birthdate({ min: 6, max: 18, mode: 'age' }),
        classId,
        sectionId: sec.id,
        guardianId,
        admissionDate: faker.date.past({ years: 1 }),
        admissionYear: new Date().getFullYear(),
        phone: guardianPhone,
        email: studentEmail,
        status: 'active',
        notes: null,
        documents: null,
        avatarFileId: null,
        isArchived: false,
      });

      links.push(
        { id: uid(), schoolId, userId: parentUserId, studentId, role: 'Parent' },
        { id: uid(), schoolId, userId: studentUserId, studentId, role: 'Student' }
      );

      // Finance: 2 invoices per student (paid + unpaid)
      const inv1Id = uid();
      const inv2Id = uid();

      const invNo1 = `INV-${new Date().getFullYear()}-${pad(i, 6)}-01`;
      const invNo2 = `INV-${new Date().getFullYear()}-${pad(i, 6)}-02`;

      invoices.push(
        {
          id: inv1Id,
          schoolId,
          studentId,
          invoiceNo: invNo1,
          invoiceNoLower: lower(invNo1),
          issuedAt: faker.date.recent({ days: 80 }),
          dueDate: faker.date.recent({ days: 40 }),
          amountPaid: 600,
          waivedAmount: 0,
          status: 'paid',
          notes: 'Seed: paid invoice',
          isArchived: false,
        },
        {
          id: inv2Id,
          schoolId,
          studentId,
          invoiceNo: invNo2,
          invoiceNoLower: lower(invNo2),
          issuedAt: faker.date.recent({ days: 15 }),
          dueDate: faker.date.soon({ days: 15 }),
          amountPaid: 0,
          waivedAmount: 0,
          status: 'unpaid',
          notes: 'Seed: unpaid invoice',
          isArchived: false,
        }
      );

      invoiceItems.push(
        { id: uid(), schoolId, invoiceId: inv1Id, label: 'Tuition', amount: 500 },
        { id: uid(), schoolId, invoiceId: inv1Id, label: 'Transport', amount: 80 },
        { id: uid(), schoolId, invoiceId: inv1Id, label: 'Library', amount: 20 },

        { id: uid(), schoolId, invoiceId: inv2Id, label: 'Tuition', amount: 500 },
        { id: uid(), schoolId, invoiceId: inv2Id, label: 'Transport', amount: 80 },
        { id: uid(), schoolId, invoiceId: inv2Id, label: 'Library', amount: 20 }
      );

      payments.push({
        id: uid(),
        schoolId,
        invoiceId: inv1Id,
        studentId,
        amount: 600,
        mode: 'bank',
        paidAt: faker.date.recent({ days: 50 }),
        receiptRef: `TXN-${new Date().getFullYear()}-${pad(i, 6)}`,
        recordedByUserId: coreUserIds.Accountant,
        isArchived: false,
      });

      // Attendance: N days in current month (unique composite is satisfied)
      for (const d of attDays) {
        attendance.push({
          id: uid(),
          schoolId,
          studentId,
          sectionId: sec.id,
          date: d, // stored as YYYY-MM-DD (string) in your schema
          status: Math.random() < 0.88 ? 'present' : Math.random() < 0.95 ? 'late' : 'absent',
          markedByUserId: teacherUserIds[0] || coreUserIds.Admin,
          note: null,
          isArchived: false,
        });
      }

      allStudentIds.push(studentId);
      studentsByClass.get(classId).push(studentId);
    }

    // insert in FK-safe order
    // eslint-disable-next-line no-await-in-loop
    await createManyBatched(prisma.guardian, guardians, 2000);
    // eslint-disable-next-line no-await-in-loop
    await createManyBatched(prisma.user, users, 2000);
    // eslint-disable-next-line no-await-in-loop
    await createManyBatched(prisma.schoolMembership, memberships, 2000);
    // eslint-disable-next-line no-await-in-loop
    await createManyBatched(prisma.student, students, 2000);
    // eslint-disable-next-line no-await-in-loop
    await createManyBatched(prisma.studentLink, links, 4000);

    // eslint-disable-next-line no-await-in-loop
    await createManyBatched(prisma.invoice, invoices, 2000);
    // eslint-disable-next-line no-await-in-loop
    await createManyBatched(prisma.invoiceItem, invoiceItems, 5000);
    // eslint-disable-next-line no-await-in-loop
    await createManyBatched(prisma.payment, payments, 2000);

    // Unique composite: skipDuplicates protects from accidental reruns
    // eslint-disable-next-line no-await-in-loop
    await createManyBatched(prisma.attendanceRecord, attendance, 8000, { skipDuplicates: true });

    console.log(`Seeded students batch ${startIdx}..${endIdx}`);
  }

  // 9) Admissions (realistic pipeline)
  console.log(`Creating admissions: ${ADMISSIONS}`);
  const admissions = [];
  const admissionStatuses = ['new', 'contacted', 'shortlisted', 'approved', 'rejected', 'converted'];

  for (let i = 1; i <= ADMISSIONS; i++) {
    const cls = classes[Math.floor(Math.random() * classes.length)];
    const st = admissionStatuses[Math.floor(Math.random() * admissionStatuses.length)];

    admissions.push({
      id: uid(),
      schoolId,
      applicantName: `${faker.person.firstName()} ${faker.person.lastName()}`,
      parentName: `${faker.person.firstName()} ${faker.person.lastName()}`,
      phone: `+1555${String(7000000 + i).slice(-7)}`,
      email: `admission${pad(i, 6)}@mail.test`,
      requestedClassId: cls.id,
      source: Math.random() < 0.5 ? 'Website' : 'Referral',
      previousSchool: Math.random() < 0.4 ? faker.company.name() : null,
      status: st,
      notes: st === 'rejected' ? 'Not eligible this cycle.' : null,
      convertedStudentId: null,
      isArchived: false,
    });
  }
  await createManyBatched(prisma.admission, admissions, 2000);

  // 10) Communications (varied audience types; students/parents can see school-wide sent)
  console.log(`Creating communications: ${COMMUNICATIONS}`);
  const comms = [];
  const roles = ['Admin', 'Principal', 'Teacher', 'Accountant', 'Librarian', 'Parent', 'Student'];

  for (let i = 1; i <= COMMUNICATIONS; i++) {
    const isSent = i % 4 !== 0;
    const audienceType =
      i % 5 === 0 ? 'role' :
      i % 7 === 0 ? 'class' :
      i % 9 === 0 ? 'section' :
      i % 11 === 0 ? 'individual' :
      'school';

    const kind = i % 6 === 0 ? 'announcement' : 'message';
    const subject = `Notice ${i}: ${faker.lorem.words({ min: 2, max: 6 })}`;

    const targetClassIds = audienceType === 'class' ? [classes[i % classes.length].id] : [];
    const targetSectionIds = audienceType === 'section' ? [sections[i % sections.length].id] : [];
    const targetStudentIds = audienceType === 'individual' ? [allStudentIds[i % allStudentIds.length]] : [];
    const targetRoles = audienceType === 'role' ? [roles[i % roles.length]] : [];

    comms.push({
      id: uid(),
      schoolId,
      kind,
      status: isSent ? 'sent' : 'draft',
      priority: i % 10 === 0 ? 'urgent' : i % 4 === 0 ? 'high' : 'medium',
      subject: kind === 'message' ? subject : null,
      title: kind === 'announcement' ? subject : null,
      body: faker.lorem.paragraphs({ min: 1, max: 2 }),
      audienceType,

      // Json? fields: store arrays (your services treat them as arrays)
      targetRoles,
      targetClassIds,
      targetSectionIds,
      targetStudentIds,

      isArchived: false,
    });
  }
  await createManyBatched(prisma.communication, comms, 2000);

  // 11) Books + Issues (+ fix availableCopies)
  console.log(`Creating books=${BOOKS} and issues=${ISSUES}`);
  const books = [];
  const bookIds = [];

  for (let i = 1; i <= BOOKS; i++) {
    const bookId = uid();
    bookIds.push(bookId);
    const copies = 5;

    books.push({
      id: bookId,
      schoolId,
      title: faker.lorem.words({ min: 2, max: 5 }),
      author: `${faker.person.firstName()} ${faker.person.lastName()}`,
      isbn: `978-1-${pad(i, 6)}-${pad(i % 9999, 4)}`,
      category: i % 4 === 0 ? 'Science' : i % 3 === 0 ? 'Literature' : 'General',
      copies,
      availableCopies: copies,
      status: 'available',
      isArchived: false,
    });
  }
  await createManyBatched(prisma.book, books, 2000);

  const issues = [];
  for (let i = 0; i < ISSUES; i++) {
    const studentId = allStudentIds[i % allStudentIds.length];
    const bookId = bookIds[(i * 7) % bookIds.length];

    const issuedAt = faker.date.recent({ days: 90 });
    const dueDate = faker.date.soon({ days: 14 }, issuedAt);
    const returned = Math.random() < 0.45;

    issues.push({
      id: uid(),
      schoolId,
      bookId,
      studentId,
      issuedAt,
      dueDate,
      returnedAt: returned ? faker.date.soon({ days: 10 }, dueDate) : null,
      fine: 0,
      status: returned ? 'returned' : 'issued',
      isArchived: false,
    });
  }
  await createManyBatched(prisma.libraryIssue, issues, 4000);

  // Fix availableCopies based on active (not returned) issues
  const activeCounts = new Map();
  for (const iss of issues) {
    if (!iss.returnedAt) activeCounts.set(iss.bookId, (activeCounts.get(iss.bookId) || 0) + 1);
  }

  for (const b of books) {
    const active = activeCounts.get(b.id) || 0;
    const nextAvailable = Math.max(0, b.copies - active);
    // eslint-disable-next-line no-await-in-loop
    await prisma.book.update({
      where: { id: b.id },
      data: {
        availableCopies: nextAvailable,
        status: nextAvailable > 0 ? 'available' : 'issued',
      },
    });
  }

  // 12) Transport routes + vehicles + assignments (one active per student)
  console.log(`Creating transport: routes=${ROUTES}, vehicles=${VEHICLES}, assignments=${TRANSPORT_ASSIGNMENTS}`);
  const routeRows = [];
  const routeIds = [];
  for (let i = 1; i <= ROUTES; i++) {
    const id = uid();
    routeIds.push(id);
    routeRows.push({
      id,
      schoolId,
      name: `Route ${i}`,
      startPoint: faker.location.streetAddress(),
      stops: [`Stop ${i}-1`, `Stop ${i}-2`, `Stop ${i}-3`], // Json? => array
      distanceKm: Math.floor(Math.random() * 25),
      assignedVehicleId: null,
      status: 'active',
      isArchived: false,
    });
  }
  await createManyBatched(prisma.route, routeRows, 2000);

  const vehicleRows = [];
  const vehicleIds = [];
  for (let i = 1; i <= VEHICLES; i++) {
    const id = uid();
    vehicleIds.push(id);
    vehicleRows.push({
      id,
      schoolId,
      name: `Vehicle ${i}`,
      plateNo: `SUM-${pad(i, 4)}`,
      capacity: 40,
      status: 'active',
      driverName: `${faker.person.firstName()} ${faker.person.lastName()}`,
      routeId: routeIds[(i - 1) % routeIds.length],
      health: 'OK',
      isArchived: false,
    });
  }
  await createManyBatched(prisma.vehicle, vehicleRows, 2000);

  // Use unique students only (avoid "one active assignment per student" conflicts)
  const transportStudentIds = allStudentIds.slice(0, Math.min(TRANSPORT_ASSIGNMENTS, allStudentIds.length));
  const transportAssignments = transportStudentIds.map((studentId, i) => ({
    id: uid(),
    schoolId,
    studentId,
    routeId: routeIds[i % routeIds.length],
    vehicleId: vehicleIds[i % vehicleIds.length],
    pickupStop: `Stop ${(i % ROUTES) + 1}-1`,
    dropStop: `Stop ${(i % ROUTES) + 1}-3`,
    active: true,
    isArchived: false,
  }));
  await createManyBatched(prisma.transportAssignment, transportAssignments, 4000);

  // 13) Assignments (class/section/subject consistent)
  console.log(`Creating assignments=${ASSIGNMENTS}`);
  const assignmentRows = [];
  for (let i = 1; i <= ASSIGNMENTS; i++) {
    const sec = sections[i % sections.length];
    const clsId = sec.classId;
    const classSubjects = classToSubjectIds.get(clsId) || subjectIds;
    const subjectId = classSubjects[i % classSubjects.length];

    assignmentRows.push({
      id: uid(),
      schoolId,
      title: `Assignment ${i}: ${faker.lorem.words({ min: 2, max: 6 })}`,
      classId: clsId,
      sectionId: sec.id,
      subjectId,
      dueDate: faker.date.soon({ days: 21 }),
      instructions: faker.lorem.paragraphs({ min: 1, max: 2 }),
      status: i % 5 === 0 ? 'draft' : 'published',
      createdByUserId: teacherUserIds[i % teacherUserIds.length] || coreUserIds.Admin,
      submissions: 0,
      lateSubmissions: 0,
      isArchived: false,
    });
  }
  await createManyBatched(prisma.assignment, assignmentRows, 2000);

  // 14) Exams + ExamSubjects + Marks (no unique collisions, class-consistent)
  console.log(`Creating exams=${EXAMS} + marks...`);
  const examRows = [];
  const examSubjectRows = [];
  const markRows = [];

  for (let i = 1; i <= EXAMS; i++) {
    const examId = uid();
    const cls = classes[i % classes.length];
    const clsSubjects = classToSubjectIds.get(cls.id) || subjectIds;

    const status = i % 6 === 0 ? 'locked' : i % 5 === 0 ? 'draft' : 'published';

    examRows.push({
      id: examId,
      schoolId,
      name: `Exam ${i}`,
      term: `Term ${(i % 3) + 1}`,
      classId: cls.id,
      status,
      scheduledFor: faker.date.soon({ days: 45 }),
      maxMarks: 100,
      isLocked: status === 'locked',
      isArchived: false,
    });

    // choose 6 subjects for this exam
    const chosen = [];
    for (let k = 0; k < 6; k++) chosen.push(clsSubjects[(i * 11 + k) % clsSubjects.length]);

    for (const sid of chosen) {
      examSubjectRows.push({
        id: uid(),
        schoolId,
        examId,
        subjectId: sid,
      });
    }

    // marks for up to 60 students in that class
    const studentIds = studentsByClass.get(cls.id) || [];
    const sampleCount = Math.min(60, studentIds.length);

    for (let s = 0; s < sampleCount; s++) {
      const studentId = studentIds[s];
      for (const sid of chosen) {
        const marks = Math.floor(50 + Math.random() * 51);
        markRows.push({
          id: uid(),
          schoolId,
          examId,
          studentId,
          subjectId: sid,
          marks,
          grade: marks >= 90 ? 'A+' : marks >= 80 ? 'A' : marks >= 70 ? 'B' : 'C',
          remarks: null,
          isArchived: false,
        });
      }
    }
  }

  await createManyBatched(prisma.exam, examRows, 2000);
  await createManyBatched(prisma.examSubject, examSubjectRows, 5000, { skipDuplicates: true });
  await createManyBatched(prisma.mark, markRows, 10000, { skipDuplicates: true });

  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Seed complete in ${seconds}s`);

  console.log('\nTest logins:');
  console.log('  admin@summitacademy.edu / password123 (or username: admin)');
  console.log('  principal@summitacademy.edu / password123 (principal)');
  console.log('  accountant@summitacademy.edu / password123 (accountant)');
  console.log('  librarian@summitacademy.edu / password123 (librarian)');
  console.log('  teacher00001@summitacademy.edu / password123 (teacher00001)');
  console.log('  parent000001@summitfamilies.test / password123 (parent_000001)');
  console.log('  student000001@summitstudents.test / password123 (student_000001)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });