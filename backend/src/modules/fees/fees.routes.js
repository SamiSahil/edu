import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import {
  createFeeStructureSchema,
  createInvoiceSchema,
  recordPaymentSchema,
  updateFeeStructureSchema,
  waiveInvoiceSchema,
} from './fees.schemas.js';

import {
  delStructure,
  getInvoice,
  getInvoices,
  getPayments,
  getStructures,
  patchStructure,
  postInvoice,
  postPayment,
  postStructure,
  postWaive,
} from './fees.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.body = parsed.data;
    next();
  };
}

router.use(requireAuth, requireSchoolContext, requirePermission('finance'));

/**
 * Fee Structure (Admin/Accountant only)
 * Frontend route: /fees/structure
 */
router.get('/structure', requireRole(['Admin', 'Accountant']), getStructures);
router.post('/structure', requireRole(['Admin', 'Accountant']), validateBody(createFeeStructureSchema), postStructure);
router.patch('/structure/:id', requireRole(['Admin', 'Accountant']), validateBody(updateFeeStructureSchema), patchStructure);
router.delete('/structure/:id', requireRole(['Admin', 'Accountant']), delStructure);

/**
 * Invoices
 * Frontend route: /fees/invoices
 * Parent allowed to view linked invoices; staff can create/waive
 */
router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoice);

router.post('/invoices', requireRole(['Admin', 'Accountant']), validateBody(createInvoiceSchema), postInvoice);

// Record payment: allow Admin/Accountant + Parent/Student (linked only is enforced in service)
router.post('/invoices/pay', validateBody(recordPaymentSchema), postPayment);

// Waive invoice: Admin/Accountant only
router.post('/invoices/:id/waive', requireRole(['Admin', 'Accountant']), validateBody(waiveInvoiceSchema), postWaive);

/**
 * Payments history (Admin/Accountant only)
 * Frontend route: /fees/payments
 */
router.get('/payments', requireRole(['Admin', 'Accountant']), getPayments);

// Optional direct payment endpoint (same as /invoices/pay) for future expansions:
router.post('/payments', requireRole(['Admin', 'Accountant']), validateBody(recordPaymentSchema), postPayment);

export default router;