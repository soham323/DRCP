import { disasterService } from '../disasters/disaster.service';
import { mockSocialService, RawExternalSocialPost } from './mock-social-service';
import { cacheStore } from '../../cache/memory-cache';
import { config } from '../../config';
import { prisma } from '../../common/prisma';
import { NormalizedReport } from './report.schema';
import { logger } from '../../common/logger';

export interface GetReportsResult {
  cached: boolean;
  degraded: boolean;
  reports: NormalizedReport[];
}

export class ReportService {
  /**
   * Normalize unstructured raw external social posts into standard platform schema.
   */
  public normalizeRawPost(post: RawExternalSocialPost, disasterId: string): NormalizedReport {
    return {
      id: post.post_id,
      disasterId,
      content: post.raw_text,
      author: post.user_handle,
      source: post.platform,
      createdAt: post.timestamp,
    };
  }

  /**
   * Retrieve community reports for a disaster utilizing the Cache-Aside pattern
   * and circuit-breaker failure fallback.
   *
   * Flow:
   * 1. Check Cache -> Hit: Return cached reports immediately (X-Cache: HIT)
   * 2. Cache Miss: Query external social service -> Normalize -> Store in cache with TTL -> Return (X-Cache: MISS)
   * 3. External Failure: Fall back to database baseline reports gracefully (X-Cache: DEGRADED)
   */
  public async getReportsForDisaster(disasterId: string): Promise<GetReportsResult> {
    // 1. Validate that the disaster incident exists
    const disaster = await disasterService.getById(disasterId);
    const cacheKey = `reports:${disasterId}`;

    // 2. Cache-Aside Check
    const cachedReports = await cacheStore.get<NormalizedReport[]>(cacheKey);
    if (cachedReports) {
      logger.info(`[Cache] HIT for key: "${cacheKey}"`);
      return {
        cached: true,
        degraded: false,
        reports: cachedReports,
      };
    }

    logger.info(`[Cache] MISS for key: "${cacheKey}". Fetching external social media feed...`);

    // 3. Cache Miss: Query external service with timeout & circuit breaker
    try {
      const rawPosts = await mockSocialService.fetchRawSocialPosts(disasterId, disaster.location.name);

      // Normalize external raw responses into standard schema
      const normalizedReports: NormalizedReport[] = rawPosts.map((p) => this.normalizeRawPost(p, disasterId));

      // Also append any registered database community reports
      const dbReports = await prisma.communityReport.findMany({
        where: { disasterId },
        orderBy: { createdAt: 'desc' },
      });

      const allReports = [
        ...normalizedReports,
        ...dbReports.map((dbR) => ({
          id: dbR.id,
          disasterId: dbR.disasterId,
          content: dbR.content,
          author: dbR.author,
          source: dbR.source,
          createdAt: dbR.createdAt.toISOString(),
        })),
      ];

      // Store in Cache with TTL (default 120s)
      await cacheStore.set(cacheKey, allReports, config.reportsCacheTtl);
      logger.info(`[Cache] Stored ${allReports.length} reports in cache for key: "${cacheKey}" (TTL: ${config.reportsCacheTtl}s)`);

      return {
        cached: false,
        degraded: false,
        reports: allReports,
      };
    } catch (error: any) {
      logger.warn(`[ReportService] External social feed failed: "${error.message}". Activating circuit-breaker fallback.`);

      // Graceful fallback to persistent database records
      const fallbackDbReports = await prisma.communityReport.findMany({
        where: { disasterId },
        orderBy: { createdAt: 'desc' },
      });

      const fallbackFormatted: NormalizedReport[] = fallbackDbReports.map((dbR) => ({
        id: dbR.id,
        disasterId: dbR.disasterId,
        content: dbR.content,
        author: dbR.author,
        source: `${dbR.source}_offline_fallback`,
        createdAt: dbR.createdAt.toISOString(),
      }));

      return {
        cached: false,
        degraded: true,
        reports: fallbackFormatted,
      };
    }
  }
}

export const reportService = new ReportService();
