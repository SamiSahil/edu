import { prisma } from '../../infra/prisma/client.js';
import { AppError } from '../../shared/errors/AppError.js';
import { trim } from '../../shared/utils/ids.js';
import { writeAuditLog } from '../audit/audit.service.js';

function computeBookStatus(availableCopies) {
  return availableCopies > 0 ? 'available' : 'issued';
}

export async function listBooks({ schoolId, query }) {
  const search = String(query.search || '').trim();

  const where = {
    schoolId,
    isArchived: false,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { author: { contains: search, mode: 'insensitive' } },
      { isbn: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.book.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createBook({ schoolId, userId, payload }) {
  // Ensure ISBN unique per school
  const dup = await prisma.book.findFirst({
    where: { schoolId, isbn: trim(payload.isbn), isArchived: false },
    select: { id: true },
  });
  if (dup) throw new AppError('ISBN already exists.', 409, 'CONFLICT', { field: 'isbn' });

  const copies = Number(payload.copies || 0);
  const availableCopies = copies;

  const book = await prisma.book.create({
    data: {
      schoolId,
      title: trim(payload.title),
      author: trim(payload.author),
      isbn: trim(payload.isbn),
      category: trim(payload.category),
      copies,
      availableCopies,
      status: payload.status || computeBookStatus(availableCopies),
    },
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'book',
    entityId: book.id,
    action: 'created',
    message: `Book added: ${book.title}`,
  });

  return book;
}

export async function listIssues({ schoolId }) {
  return prisma.libraryIssue.findMany({
    where: { schoolId, isArchived: false },
    orderBy: { issuedAt: 'desc' },
    include: {
      book: { select: { id: true, title: true } },
      student: { select: { id: true, fullName: true } },
    },
  });
}

export async function issueBook({ schoolId, userId, payload }) {
  const book = await prisma.book.findFirst({
    where: { schoolId, id: payload.bookId, isArchived: false },
  });
  if (!book) throw new AppError('Book not found.', 404, 'NOT_FOUND');

  if (Number(book.availableCopies || 0) <= 0) {
    throw new AppError('No copies available.', 400, 'VALIDATION_ERROR');
  }

  const student = await prisma.student.findFirst({
    where: { schoolId, id: payload.studentId, isArchived: false },
    select: { id: true, fullName: true },
  });
  if (!student) throw new AppError('Student not found.', 400, 'VALIDATION_ERROR', { field: 'studentId' });

  const result = await prisma.$transaction(async (tx) => {
    const issue = await tx.libraryIssue.create({
      data: {
        schoolId,
        bookId: book.id,
        studentId: student.id,
        issuedAt: new Date(payload.issuedAt),
        dueDate: new Date(payload.dueDate),
        returnedAt: null,
        fine: 0,
        status: 'issued',
      },
      include: {
        book: { select: { id: true, title: true } },
        student: { select: { id: true, fullName: true } },
      },
    });

    const nextAvailable = Math.max(0, Number(book.availableCopies || 0) - 1);

    await tx.book.update({
      where: { id: book.id },
      data: {
        availableCopies: nextAvailable,
        status: computeBookStatus(nextAvailable),
      },
    });

    return issue;
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'libraryIssue',
    entityId: result.id,
    action: 'issued',
    message: `Issued "${book.title}" to ${student.fullName}`,
  });

  return result;
}

export async function returnBook({ schoolId, userId, issueId, returnedAt }) {
  const issue = await prisma.libraryIssue.findFirst({
    where: { schoolId, id: issueId, isArchived: false },
    include: { book: true, student: { select: { fullName: true } } },
  });
  if (!issue) throw new AppError('Issue record not found.', 404, 'NOT_FOUND');

  if (issue.returnedAt) {
    throw new AppError('This book is already returned.', 400, 'VALIDATION_ERROR');
  }

  const returnDate = returnedAt ? new Date(returnedAt) : new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updatedIssue = await tx.libraryIssue.update({
      where: { id: issue.id },
      data: {
        returnedAt: returnDate,
        status: 'returned',
        // Fine logic: keep existing fine (or extend later)
        fine: issue.fine || 0,
      },
      include: {
        book: { select: { id: true, title: true, copies: true, availableCopies: true } },
        student: { select: { id: true, fullName: true } },
      },
    });

    const currentBook = await tx.book.findFirst({ where: { id: issue.bookId } });
    const nextAvailable = Math.min(
      Number(currentBook.copies || 0),
      Number(currentBook.availableCopies || 0) + 1
    );

    await tx.book.update({
      where: { id: issue.bookId },
      data: {
        availableCopies: nextAvailable,
        status: computeBookStatus(nextAvailable),
      },
    });

    return updatedIssue;
  });

  await writeAuditLog({
    schoolId,
    userId,
    entityType: 'libraryIssue',
    entityId: issue.id,
    action: 'returned',
    message: `Returned "${issue.book.title}" from ${issue.student?.fullName || 'member'}`,
  });

  return result;
}