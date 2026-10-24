import { Router } from 'express';
import { disasterController } from './disaster.controller';
import { resourceController } from '../resources/resource.controller';
import { reportController } from '../reports/report.controller';
import { requireRole, optionalAuth, UserRole } from '../../middleware/auth.middleware';

const router = Router();

// Public Read Endpoints (Supports optionalAuth for context if credentials provided)
router.get('/', optionalAuth, (req, res, next) => disasterController.list(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => disasterController.getById(req, res, next));
router.get('/:id/resources', optionalAuth, (req, res, next) => resourceController.getNearbyForDisaster(req, res, next));
router.get('/:id/reports', optionalAuth, (req, res, next) => reportController.getReports(req, res, next));

// Protected Mutation Endpoints
// Create: ADMIN or CONTRIBUTOR
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.CONTRIBUTOR]),
  (req, res, next) => disasterController.create(req, res, next)
);

// Partial Update: ADMIN or CONTRIBUTOR
router.patch(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.CONTRIBUTOR]),
  (req, res, next) => disasterController.update(req, res, next)
);

// Deletion: Strictly ADMIN only (Returns 403 Forbidden for CONTRIBUTOR or VIEWER)
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN]),
  (req, res, next) => disasterController.delete(req, res, next)
);

export default router;
