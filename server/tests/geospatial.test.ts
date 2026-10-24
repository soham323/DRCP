import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/common/prisma';
import { calculateHaversineDistanceKm } from '../src/common/haversine';
import { config } from '../src/config';
import {
  UserRole,
  HttpHeader,
  AuthScheme,
  ResourceType,
  ResourceStatus,
} from '../src/common/enums';

describe('Geospatial Haversine & Emergency Resources Suite', () => {
  let contributorToken: string;
  let manhattanDisasterId: string;
  let createdResourceId: string;

  beforeAll(async () => {
    // 1. Authenticate to obtain contributor credentials for mutating calls
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: config.auth.contributor.username,
        password: config.auth.contributor.password,
      });
    expect(loginRes.status).toBe(200);
    contributorToken = loginRes.body.token;

    // 2. Fetch seeded Manhattan disaster
    const disaster = await prisma.disaster.findFirst({
      where: { locationName: { contains: 'Manhattan' } },
    });
    if (!disaster) {
      throw new Error('Seed disaster in Manhattan not found. Please ensure database seed was executed.');
    }
    manhattanDisasterId = disaster.id;
  });

  afterAll(async () => {
    if (createdResourceId) {
      await prisma.emergencyResource.deleteMany({
        where: { id: createdResourceId },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. Haversine Great-Circle Mathematical Formula Precision', () => {
    const manhattan = { latitude: 40.7831, longitude: -73.9712 };
    const midtown = { latitude: 40.7589, longitude: -73.9851 };
    const brooklyn = { latitude: 40.672, longitude: -73.953 };

    it('computes 0 km for identical origin and destination coordinates', () => {
      const distance = calculateHaversineDistanceKm(manhattan, manhattan);
      expect(distance).toBe(0);
    });

    it('calculates Manhattan to Midtown distance within ~2.8 km tolerance', () => {
      const distance = calculateHaversineDistanceKm(manhattan, midtown);
      expect(distance).toBeGreaterThanOrEqual(2.5);
      expect(distance).toBeLessThanOrEqual(3.2);
    });

    it('calculates Manhattan to Brooklyn distance within ~12.5 km tolerance', () => {
      const distance = calculateHaversineDistanceKm(manhattan, brooklyn);
      expect(distance).toBeGreaterThanOrEqual(12.0);
      expect(distance).toBeLessThanOrEqual(13.5);
    });
  });

  describe('2. Proximity Search (GET /api/v1/disasters/:id/resources)', () => {
    it('returns emergency resources within 3km radius sorted by ascending distance', async () => {
      const res = await request(app).get(`/api/v1/disasters/${manhattanDisasterId}/resources?radius=3`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.origin.radius_km).toBe(3);
      expect(res.body.count).toBeGreaterThanOrEqual(1);

      // Verify all items are <= 3km
      const allWithin3km = res.body.data.every((r: any) => r.distance_km <= 3);
      expect(allWithin3km).toBe(true);

      // Verify strictly ascending order (nearest first)
      const isAscending = res.body.data.every((r: any, idx: number, arr: any[]) => {
        return idx === 0 || arr[idx - 1].distance_km <= r.distance_km;
      });
      expect(isAscending).toBe(true);
    });

    it('returns an expanded set of resources when radius is increased to 20km', async () => {
      const res3km = await request(app).get(`/api/v1/disasters/${manhattanDisasterId}/resources?radius=3`);
      const res20km = await request(app).get(`/api/v1/disasters/${manhattanDisasterId}/resources?radius=20`);

      expect(res20km.status).toBe(200);
      expect(res20km.body.count).toBeGreaterThan(res3km.body.count);

      // Verify presence of regional outer-borough assets
      const hasOuterBorough = res20km.body.data.some(
        (r: any) => r.name.includes('Brooklyn') || r.name.includes('Jersey City')
      );
      expect(hasOuterBorough).toBe(true);
    });

    it('filters resources by type (e.g. ?type=WATER)', async () => {
      const res = await request(app).get(
        `/api/v1/disasters/${manhattanDisasterId}/resources?radius=25&type=${ResourceType.WATER}`
      );

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
      const allWater = res.body.data.every((r: any) => r.type === ResourceType.WATER);
      expect(allWater).toBe(true);
    });

    it('rejects negative radius query parameters with HTTP 400 Bad Request', async () => {
      const res = await request(app).get(`/api/v1/disasters/${manhattanDisasterId}/resources?radius=-5`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Resource Creation & RBAC Protection (POST /api/v1/resources)', () => {
    it('rejects unauthenticated resource creation with HTTP 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/resources')
        .send({
          name: 'Unauthenticated Medical Depot',
          type: ResourceType.HOSPITAL,
          location: {
            name: 'Downtown Medical Outpost',
            latitude: 40.7128,
            longitude: -74.006,
          },
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('allows authenticated contributor to register an emergency relief resource', async () => {
      const res = await request(app)
        .post('/api/v1/resources')
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${contributorToken}`)
        .send({
          name: 'Emergency Mobile Triage Unit',
          type: ResourceType.RESCUE,
          location: {
            name: 'Chelsea Logistics Pier',
            latitude: 40.7465,
            longitude: -74.008,
          },
          capacity: 45,
          status: ResourceStatus.AVAILABLE,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Emergency Mobile Triage Unit');
      expect(res.body.data.type).toBe(ResourceType.RESCUE);
      createdResourceId = res.body.data.id;
    });
  });
});
