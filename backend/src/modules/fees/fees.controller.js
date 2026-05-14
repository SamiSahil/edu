import { created, ok } from '../../shared/http/response.js';

import {
  archiveFeeStructure,
  createFeeStructure,
  createInvoice,
  getInvoiceById,
  listFeeStructures,
  listInvoices,
  listPayments,
  recordPayment,
  updateFeeStructure,
  waiveInvoice,
} from './fees.service.js';

export async function getStructures(req, res) {
  const items = await listFeeStructures({ schoolId: req.school.id });
  return ok(res, items);
}

export async function postStructure(req, res) {
  const item = await createFeeStructure({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });
  return created(res, item);
}

export async function patchStructure(req, res) {
  const item = await updateFeeStructure({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    payload: req.body,
  });
  return ok(res, item);
}

export async function delStructure(req, res) {
  const item = await archiveFeeStructure({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
  });
  return ok(res, item);
}

export async function getInvoices(req, res) {
  const result = await listInvoices({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    query: req.query,
  });
  return ok(res, result.items, result.meta);
}

export async function getInvoice(req, res) {
  const item = await getInvoiceById({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    id: req.params.id,
  });
  return ok(res, item);
}

export async function postInvoice(req, res) {
  const item = await createInvoice({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });
  return created(res, item);
}

export async function postPayment(req, res) {
  const result = await recordPayment({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    payload: req.body,
  });
  return ok(res, result);
}

export async function postWaive(req, res) {
  const result = await waiveInvoice({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    amount: req.body.amount,
  });
  return ok(res, result);
}

export async function getPayments(req, res) {
  const result = await listPayments({
    schoolId: req.school.id,
    query: req.query,
  });
  return ok(res, result.items, result.meta);
}