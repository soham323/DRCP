import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import disasterRoutes from './modules/disasters/disaster.routes';
import resourceRoutes from './modules/resources/resource.routes';
import authRoutes from './modules/auth/auth.routes';
import { errorHandler } from './middleware/error.middleware';
import { NotFoundError } from './common/errors';

export function createApp(): Application {
  const app = express();

  // 1. Security & Parsing Middlewares
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // 2. Health Check Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'Disaster Response Coordination Platform (DRCP)',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // 3. API Domain Routes (Supporting both standard /api/v1 and root shortcuts)
  app.use('/api/v1/auth', authRoutes);
  app.use('/auth', authRoutes);

  app.use('/api/v1/disasters', disasterRoutes);
  app.use('/disasters', disasterRoutes);

  app.use('/api/v1/resources', resourceRoutes);
  app.use('/resources', resourceRoutes);

  // 4. Catch-all 404 Route Handler
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Cannot ${req.method} ${req.path}`));
  });

  // 5. Global Error Handling Middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
