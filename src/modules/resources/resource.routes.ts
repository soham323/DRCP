import { Router } from 'express';
import { resourceController } from './resource.controller';

const router = Router();

router.get('/', (req, res, next) => resourceController.listAll(req, res, next));
router.post('/', (req, res, next) => resourceController.create(req, res, next));

export default router;
