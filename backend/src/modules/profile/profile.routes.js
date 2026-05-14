import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { AppError } from '../../shared/errors/AppError.js';

import { updateMeSchema, changePasswordSchema } from '../users/users.schemas.js';
import { patchMe, getMe, postChangePassword } from '../users/users.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    req.body = parsed.data;
    next();
  };
}

router.get('/', requireAuth, getMe);
router.patch('/', requireAuth, validateBody(updateMeSchema), patchMe);
router.post('/change-password', requireAuth, validateBody(changePasswordSchema), postChangePassword);

export default router;