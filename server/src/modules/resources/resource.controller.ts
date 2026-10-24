import { Request, Response, NextFunction } from 'express';
import { resourceService } from './resource.service';
import { NearbyResourcesQuerySchema, CreateResourceSchema } from './resource.schema';
import { DisasterIdParamSchema } from '../disasters/disaster.schema';

export class ResourceController {
  /**
   * GET /api/v1/disasters/:id/resources?radius=<km>&lat=<lat>&lng=<lng>&type=<type>
   */
  public async getNearbyForDisaster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = DisasterIdParamSchema.parse(req.params);
      const query = NearbyResourcesQuerySchema.parse(req.query);

      const result = await resourceService.findNearbyForDisaster(id, query);

      res.status(200).json({
        status: 'success',
        origin: result.origin,
        count: result.count,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/resources
   */
  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = CreateResourceSchema.parse(req.body);
      const resource = await resourceService.create(validatedInput);

      res.status(201).json({
        status: 'success',
        message: 'Emergency resource registered successfully',
        data: resource,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/resources
   */
  public async listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = req.query.type as string | undefined;
      const resources = await resourceService.listAll(type);

      res.status(200).json({
        status: 'success',
        count: resources.length,
        data: resources,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const resourceController = new ResourceController();
