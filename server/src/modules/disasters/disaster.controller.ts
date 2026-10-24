import { Request, Response, NextFunction } from 'express';
import { disasterService } from './disaster.service';
import {
  CreateDisasterSchema,
  UpdateDisasterSchema,
  QueryDisastersSchema,
  DisasterIdParamSchema,
} from './disaster.schema';
import { UserRole } from '../../common/enums';

export class DisasterController {
  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = CreateDisasterSchema.parse(req.body);
      validatedInput.createdBy = validatedInput.createdBy || req.user?.username || UserRole.CONTRIBUTOR.toLowerCase();
      const disaster = await disasterService.create(validatedInput);

      res.status(201).json({
        status: 'success',
        message: 'Disaster incident reported successfully',
        data: disaster,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = DisasterIdParamSchema.parse(req.params);
      const disaster = await disasterService.getById(id);

      res.status(200).json({
        status: 'success',
        data: disaster,
      });
    } catch (error) {
      next(error);
    }
  }

  public async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = QueryDisastersSchema.parse(req.query);
      const { items, total, limit, offset } = await disasterService.list(query);

      res.status(200).json({
        status: 'success',
        meta: {
          total,
          limit,
          offset,
        },
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = DisasterIdParamSchema.parse(req.params);
      const validatedInput = UpdateDisasterSchema.parse(req.body);
      const updated = await disasterService.update(id, validatedInput);

      res.status(200).json({
        status: 'success',
        message: 'Disaster incident updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = DisasterIdParamSchema.parse(req.params);
      await disasterService.delete(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const disasterController = new DisasterController();
