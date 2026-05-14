import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { AppError } from '../../shared/errors/AppError.js';
import { confirmSchema, signatureSchema } from './files.schemas.js';
import { postConfirm, postSignature } from './files.controller.js';

const router = Router();

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    }
    req.body = parsed.data;
    next();
  };
}

router.post('/signature', requireAuth, requireSchoolContext, validate(signatureSchema), postSignature);
router.post('/confirm', requireAuth, requireSchoolContext, validate(confirmSchema), postConfirm);

export default router;