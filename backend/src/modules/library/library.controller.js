import { created, ok } from '../../shared/http/response.js';
import { createBook, issueBook, listBooks, listIssues, returnBook } from './library.service.js';

export async function getBooks(req, res) {
  const items = await listBooks({ schoolId: req.school.id, query: req.query });
  return ok(res, items);
}

export async function postBook(req, res) {
  const item = await createBook({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });
  return created(res, item);
}

export async function getIssueReturn(req, res) {
  const items = await listIssues({ schoolId: req.school.id });
  return ok(res, items);
}

export async function postIssue(req, res) {
  const item = await issueBook({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });
  return created(res, item);
}

export async function postReturn(req, res) {
  const item = await returnBook({
    schoolId: req.school.id,
    userId: req.auth.userId,
    issueId: req.params.id,
    returnedAt: req.body?.returnedAt,
  });
  return ok(res, item);
}