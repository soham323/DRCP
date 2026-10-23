import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { DisasterIdParamSchema } from '../disasters/disaster.schema';
import { config } from '../../config';

export class ReportController {
  /**
   * GET /api/v1/disasters/:id/reports
   */
  public async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = DisasterIdParamSchema.parse(req.params);
      const result = await reportService.getReportsForDisaster(id);

      // Set Cache-Aside metadata headers
      res.setHeader('X-Cache', result.cached ? 'HIT' : result.degraded ? 'DEGRADED' : 'MISS');
      res.setHeader('X-Cache-TTL', config.reportsCacheTtl.toString());

      res.status(200).json({
        status: 'success',
        disaster_id: id,
        cached: result.cached,
        degraded: result.degraded,
        count: result.reports.length,
        data: result.reports,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
