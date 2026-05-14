import { created, ok } from '../../shared/http/response.js';

import {
  archiveCommunication,
  createCommunication,
  getCommunicationById,
  listCommunications,
  updateCommunication,
  getCommunicationLookups,
} from './communication.service.js';

export async function getList(req, res) {
  const status = String(req.query.status || 'all');
  const items = await listCommunications({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    status,
  });
  return ok(res, items);
}

export async function getDetail(req, res) {
  const record = await getCommunicationById({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,
    id: req.params.id,
  });
  return ok(res, record);
}

export async function getLookups(req, res) {
  const data = await getCommunicationLookups({
    schoolId: req.school.id,
    userId: req.auth.userId,          // ✅ added
    role: req.school.role,            // ✅ added
    search: String(req.query.search || '').trim(),
  });
  return ok(res, data);
}

export async function postCreate(req, res) {
  const result = await createCommunication({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,            // ✅ added
    payload: req.body,
  });
  return created(res, result);
}

export async function patchUpdate(req, res) {
  const result = await updateCommunication({
    schoolId: req.school.id,
    userId: req.auth.userId,
    role: req.school.role,            // ✅ added
    id: req.params.id,
    payload: req.body,
  });
  return ok(res, result);
}

export async function postArchive(req, res) {
  const record = await archiveCommunication({
    schoolId: req.school.id,
    userId: req.auth.userId,
    id: req.params.id,
    reason: req.body?.reason || '',
  });
  return ok(res, record);
}