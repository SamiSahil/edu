import { created, ok } from '../../shared/http/response.js';
import { createSignedUpload, confirmUpload } from './files.service.js';

export async function postSignature(req, res) {
  const sig = await createSignedUpload({
    schoolId: req.school.id,
    userId: req.auth.userId,
    resourceType: req.body.resourceType,
    entityType: req.body.entityType,
    entityId: req.body.entityId,
    tags: req.body.tags,
  });

  return ok(res, sig);
}

export async function postConfirm(req, res) {
  const file = await confirmUpload({
    schoolId: req.school.id,
    userId: req.auth.userId,
    payload: req.body,
  });

  return created(res, file);
}