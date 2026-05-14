import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { AppError } from '../../shared/errors/AppError.js';
import { selectSchoolSchema } from './tenancy.schemas.js';
import { getMySchools, postSelectSchool } from './tenancy.controller.js';

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

router.get('/schools', requireAuth, getMySchools);
router.post('/select-school', requireAuth, validate(selectSchoolSchema), postSelectSchool);

export default router;