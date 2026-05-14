import { Router } from 'express';

import { requireAuth } from '../../shared/middlewares/requireAuth.js';
import { requireSchoolContext } from '../../shared/middlewares/requireSchoolContext.js';
import { requireRole } from '../../shared/middlewares/requireRole.js';

import { postSeed } from './setup.controller.js';

const router = Router();

/**
 * DEV ONLY seed endpoint.
 * Must be Admin for current school.
 *
 * Body:
 * { mode: "small" | "large", force?: boolean }
 */
router.post('/seed', requireAuth, requireSchoolContext, requireRole(['Admin']), postSeed);

export default router;