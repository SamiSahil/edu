import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import { createBookSchema, issueBookSchema, returnBookSchema } from './library.schemas.js';
import { getBooks, getIssueReturn, postBook, postIssue, postReturn } from './library.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.body = parsed.data;
    next();
  };
}

router.use(requireAuth, requireSchoolContext, requirePermission('library'));

// Library roles in frontend: Librarian + Admin
const LIBRARY_ROLES = ['Admin', 'Librarian'];

/**
 * Books
 * Frontend route: /library/books
 */
router.get('/books', requireRole(LIBRARY_ROLES), getBooks);
router.post('/books', requireRole(LIBRARY_ROLES), validateBody(createBookSchema), postBook);

/**
 * Issue/Return
 * Frontend route: /library/issue-return
 */
router.get('/issue-return', requireRole(LIBRARY_ROLES), getIssueReturn);
router.post('/issue-return', requireRole(LIBRARY_ROLES), validateBody(issueBookSchema), postIssue);
router.post('/issue-return/:id/return', requireRole(LIBRARY_ROLES), validateBody(returnBookSchema), postReturn);

export default router;