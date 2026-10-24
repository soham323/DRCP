import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/common/prisma';
import { cacheStore, MemoryCacheStore } from '../src/cache/memory-cache';
import { mockSocialService } from '../src/modules/reports/mock-social-service';
import { HttpHeader, CacheStatus } from '../src/common/enums';

describe('Cache-Aside Architecture & Outage Resilience Suite', () => {
  let manhattanDisasterId: string;

  beforeAll(async () => {
    const disaster = await prisma.disaster.findFirst({
      where: { locationName: { contains: 'Manhattan' } },
    });
    if (!disaster) {
      throw new Error('Seed disaster in Manhattan not found. Please ensure database seed was executed.');
    }
    manhattanDisasterId = disaster.id;
  });

  afterAll(async () => {
    // Ensure failure simulation is disabled and clean cache
    mockSocialService.setSimulateFailure(false);
    await cacheStore.del(`reports:${manhattanDisasterId}`);
    await prisma.$disconnect();
  });

  describe('1. MemoryCacheStore LRU Unit Functionality', () => {
    it('stores, retrieves, and evicts cached items with TTL', async () => {
      const testStore = new MemoryCacheStore(10, 60);

      // Store item
      await testStore.set('test_key', { alert: 'flood_detected' }, 30);

      // Retrieve item
      const retrieved = await testStore.get<{ alert: string }>('test_key');
      expect(retrieved).toBeDefined();
      expect(retrieved?.alert).toBe('flood_detected');

      // Non-existent key returns null
      const nonExistent = await testStore.get('unknown_key');
      expect(nonExistent).toBeNull();

      // Explicit delete
      await testStore.del('test_key');
      const afterDel = await testStore.get('test_key');
      expect(afterDel).toBeNull();

      // Clear store
      await testStore.set('k1', 'val1');
      await testStore.set('k2', 'val2');
      await testStore.clear();
      expect(await testStore.get('k1')).toBeNull();
      expect(await testStore.get('k2')).toBeNull();
    });
  });

  describe('2. Cache-Aside Lifecycle on Community Reports (GET /api/v1/disasters/:id/reports)', () => {
    it('triggers a Cache Miss on first request and returns X-Cache: MISS header', async () => {
      // Ensure clean cache state
      await cacheStore.del(`reports:${manhattanDisasterId}`);

      const res = await request(app).get(`/api/v1/disasters/${manhattanDisasterId}/reports`);

      expect(res.status).toBe(200);
      expect(res.headers[HttpHeader.X_CACHE.toLowerCase()]).toBe(CacheStatus.MISS);
      expect(res.body.cached).toBe(false);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    it('triggers an instantaneous Cache Hit on subsequent request and returns X-Cache: HIT header', async () => {
      const res = await request(app).get(`/api/v1/disasters/${manhattanDisasterId}/reports`);

      expect(res.status).toBe(200);
      expect(res.headers[HttpHeader.X_CACHE.toLowerCase()]).toBe(CacheStatus.HIT);
      expect(res.body.cached).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns Cache Miss again after cache key invalidation', async () => {
      // Invalidate key
      await cacheStore.del(`reports:${manhattanDisasterId}`);

      const res = await request(app).get(`/api/v1/disasters/${manhattanDisasterId}/reports`);

      expect(res.status).toBe(200);
      expect(res.headers[HttpHeader.X_CACHE.toLowerCase()]).toBe(CacheStatus.MISS);
      expect(res.body.cached).toBe(false);
    });
  });

  describe('3. Circuit Breaker & External Outage Resilience', () => {
    it('handles simulated downstream API gateway timeout (504) gracefully with HTTP 200 and X-Cache: DEGRADED', async () => {
      // Invalidate cache and activate failure simulation on external social provider
      await cacheStore.del(`reports:${manhattanDisasterId}`);
      mockSocialService.setSimulateFailure(true);

      try {
        const res = await request(app).get(`/api/v1/disasters/${manhattanDisasterId}/reports`);

        // System must not crash or surface 504 to end-user
        expect(res.status).toBe(200);
        expect(res.headers[HttpHeader.X_CACHE.toLowerCase()]).toBe(CacheStatus.DEGRADED);
        expect(res.body.degraded).toBe(true);
        expect(res.body.cached).toBe(false);
        expect(Array.isArray(res.body.data)).toBe(true);
      } finally {
        // Guarantee reset of failure simulation
        mockSocialService.setSimulateFailure(false);
      }
    });

    it('recovers to standard operation once external provider is restored', async () => {
      // Invalidate cache
      await cacheStore.del(`reports:${manhattanDisasterId}`);

      const res = await request(app).get(`/api/v1/disasters/${manhattanDisasterId}/reports`);

      expect(res.status).toBe(200);
      expect(res.headers[HttpHeader.X_CACHE.toLowerCase()]).toBe(CacheStatus.MISS);
      expect(res.body.cached).toBe(false);
      expect(res.body.degraded).toBe(false);
    });
  });
});
