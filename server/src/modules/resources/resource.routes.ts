import { Router } from 'express';
import { resourceController } from './resource.controller';
import { requireRole, optionalAuth } from '../../middleware/auth.middleware';
import { UserRole } from '../../common/enums';

const router = Router();

// Public Read
router.get('/', optionalAuth, (req, res, next) => resourceController.listAll(req, res, next));

// Protected Creation: ADMIN or CONTRIBUTOR
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.CONTRIBUTOR]),
  (req, res, next) => resourceController.create(req, res, next)
);

export default router;
