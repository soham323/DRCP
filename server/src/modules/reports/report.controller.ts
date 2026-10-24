import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { DisasterIdParamSchema } from '../disasters/disaster.schema';
import { config } from '../../config';
import { HttpHeader, CacheStatus } from '../../common/enums';

export class ReportController {
  /**
   * GET /api/v1/disasters/:id/reports
   */
  public async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = DisasterIdParamSchema.parse(req.params);
      const result = await reportService.getReportsForDisaster(id);

      // Set Cache-Aside metadata headers using strongly typed enums
      const cacheStatus = result.cached
        ? CacheStatus.HIT
        : result.degraded
        ? CacheStatus.DEGRADED
        : CacheStatus.MISS;

      res.setHeader(HttpHeader.X_CACHE, cacheStatus);
      res.setHeader(HttpHeader.X_CACHE_TTL, config.reportsCacheTtl.toString());

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
