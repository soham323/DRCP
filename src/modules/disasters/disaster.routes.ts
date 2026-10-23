import { Router } from 'express';
import { disasterController } from './disaster.controller';
import { resourceController } from '../resources/resource.controller';
import { reportController } from '../reports/report.controller';

const router = Router();

// Disaster CRUD endpoints
router.post('/', (req, res, next) => disasterController.create(req, res, next));
router.get('/', (req, res, next) => disasterController.list(req, res, next));
router.get('/:id', (req, res, next) => disasterController.getById(req, res, next));
router.patch('/:id', (req, res, next) => disasterController.update(req, res, next));
router.delete('/:id', (req, res, next) => disasterController.delete(req, res, next));

// Sub-resource endpoints
router.get('/:id/resources', (req, res, next) => resourceController.getNearbyForDisaster(req, res, next));
router.get('/:id/reports', (req, res, next) => reportController.getReports(req, res, next));

export default router;
