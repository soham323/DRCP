import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Account creation and credential authentication endpoints
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// User profile inspection (requires verified Bearer token or API key)
router.get('/me', requireAuth, (req, res, next) => authController.getProfile(req, res, next));

export default router;
