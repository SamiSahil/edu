import { Router } from 'express';
import { AppError } from '../../shared/errors/AppError.js';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requirePermission } from '../../shared/middlewares/requirePermission.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import { convertAdmissionSchema, createAdmissionSchema, updateAdmissionSchema } from './admissions.schemas.js';
import { getDetail, getList, patchUpdate, postArchive, postConvert, postCreate } from './admissions.controller.js';

const router = Router();

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Validation error.', 400, 'VALIDATION_ERROR', parsed.error.flatten());
    }
    req.body = parsed.data;
    next();
  };
}

router.use(requireAuth, requireSchoolContext, requirePermission('admissions'));

// Admissions are Admin/Principal only in your frontend router/menu
router.get('/', requireRole(['Admin', 'Principal']), getList);
router.get('/:id', requireRole(['Admin', 'Principal']), getDetail);

router.post('/', requireRole(['Admin', 'Principal']), validateBody(createAdmissionSchema), postCreate);
router.patch('/:id', requireRole(['Admin', 'Principal']), validateBody(updateAdmissionSchema), patchUpdate);

router.post('/:id/archive', requireRole(['Admin', 'Principal']), postArchive);
router.delete('/:id', requireRole(['Admin', 'Principal']), postArchive);

router.post('/:id/convert', requireRole(['Admin', 'Principal']), validateBody(convertAdmissionSchema), postConvert);

export default router;