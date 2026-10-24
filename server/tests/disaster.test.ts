import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/common/prisma';
import { config } from '../src/config';
import {
  UserRole,
  HttpHeader,
  AuthScheme,
  DisasterStatus,
} from '../src/common/enums';

describe('Disaster Incident Management API Suite', () => {
  let adminToken: string;
  let contributorToken: string;
  let createdDisasterId: string;

  beforeAll(async () => {
    // Obtain valid tokens for authenticated mutations
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: config.auth.admin.username,
        password: config.auth.admin.password,
      });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.token;

    const contribRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: config.auth.contributor.username,
        password: config.auth.contributor.password,
      });
    expect(contribRes.status).toBe(200);
    contributorToken = contribRes.body.token;
  });

  afterAll(async () => {
    if (createdDisasterId) {
      await prisma.disaster.deleteMany({
        where: { id: createdDisasterId },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. Server Health & Unauthenticated Mutation Protection', () => {
    it('returns HTTP 200 OK for GET /health', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptime).toBe('number');
    });

    it('rejects unauthenticated POST /api/v1/disasters with HTTP 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/disasters')
        .send({
          title: 'Unauthenticated Flood',
          description: 'Flash flood reported without authentication credentials.',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects unauthenticated PATCH /api/v1/disasters/:id with HTTP 401 Unauthorized', async () => {
      const res = await request(app)
        .patch('/api/v1/disasters/00000000-0000-0000-0000-000000000000')
        .send({ title: 'Unauthenticated Update' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects unauthenticated DELETE /api/v1/disasters/:id with HTTP 401 Unauthorized', async () => {
      const res = await request(app)
        .delete('/api/v1/disasters/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('2. Disaster Creation & NLP Location Extraction', () => {
    it('extracts Manhattan coordinates automatically from narrative description', async () => {
      const res = await request(app)
        .post('/api/v1/disasters')
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${contributorToken}`)
        .send({
          title: 'Severe Flash Flooding Event',
          description: 'Heavy flooding has affected Manhattan, NYC with subway stations submerged under rapidly rising water.',
          tags: ['flood', 'urgent', 'evacuation'],
          status: DisasterStatus.ACTIVE,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.location.name).toBe('Manhattan, NYC');
      expect(res.body.data.location.latitude).toBeCloseTo(40.7831, 2);
      expect(res.body.data.location.longitude).toBeCloseTo(-73.9712, 2);
      expect(res.body.data.status).toBe(DisasterStatus.ACTIVE);
      expect(res.body.data.tags).toContain('flood');
      createdDisasterId = res.body.data.id;
    });

    it('preserves explicitly supplied coordinates without overwriting via NLP', async () => {
      const res = await request(app)
        .post('/api/v1/disasters')
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${contributorToken}`)
        .send({
          title: 'Explicit Coordinate Incident',
          description: 'Incident with predetermined GPS coordinates provided by field telemetry.',
          location: {
            name: 'Custom Field Site',
            latitude: 19.076,
            longitude: 72.8777,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.location.name).toBe('Custom Field Site');
      expect(res.body.data.location.latitude).toBe(19.076);
      expect(res.body.data.location.longitude).toBe(72.8777);

      // Clean up auxiliary disaster
      await prisma.disaster.delete({ where: { id: res.body.data.id } });
    });
  });

  describe('3. Request Validation & RFC 7807 Error Responses', () => {
    it('rejects payloads with title shorter than 3 characters', async () => {
      const res = await request(app)
        .post('/api/v1/disasters')
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${contributorToken}`)
        .send({
          title: 'A',
          description: 'Valid description that has sufficient length for validation.',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    it('rejects payloads with description shorter than 10 characters', async () => {
      const res = await request(app)
        .post('/api/v1/disasters')
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${contributorToken}`)
        .send({
          title: 'Valid Disaster Title',
          description: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects payloads with invalid latitude coordinates (> 90)', async () => {
      const res = await request(app)
        .post('/api/v1/disasters')
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${contributorToken}`)
        .send({
          title: 'Invalid Coordinates Incident',
          description: 'Incident provided with latitude outside terrestrial range.',
          location: {
            name: 'Invalid Site',
            latitude: 120.5,
            longitude: 45.0,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('4. List, Pagination & Filtering', () => {
    it('returns a paginated list of disaster incidents with metadata', async () => {
      const res = await request(app).get('/api/v1/disasters?limit=5&offset=0');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.limit).toBe(5);
      expect(res.body.meta.offset).toBe(0);
      expect(typeof res.body.meta.total).toBe('number');
    });

    it('filters disasters by tag query parameter', async () => {
      const res = await request(app).get('/api/v1/disasters?tag=flood');
      expect(res.status).toBe(200);
      const allHaveFlood = res.body.data.every((d: any) => d.tags.includes('flood'));
      expect(allHaveFlood).toBe(true);
    });

    it('filters disasters by status query parameter', async () => {
      const res = await request(app).get(`/api/v1/disasters?status=${DisasterStatus.ACTIVE}`);
      expect(res.status).toBe(200);
      const allActive = res.body.data.every((d: any) => d.status === DisasterStatus.ACTIVE);
      expect(allActive).toBe(true);
    });
  });

  describe('5. Entity Retrieval & 404 Not Found Handling', () => {
    it('returns a single disaster entity matching requested UUID', async () => {
      const res = await request(app).get(`/api/v1/disasters/${createdDisasterId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdDisasterId);
      expect(res.body.data.location.name).toBe('Manhattan, NYC');
    });

    it('returns HTTP 404 Not Found for non-existent UUID', async () => {
      const res = await request(app).get('/api/v1/disasters/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('6. Disaster Modification (PATCH)', () => {
    it('allows authenticated contributor to update status and title', async () => {
      const res = await request(app)
        .patch(`/api/v1/disasters/${createdDisasterId}`)
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${contributorToken}`)
        .send({
          status: DisasterStatus.CONTAINED,
          title: 'Updated: Flash Flood Lower Manhattan (Controlled)',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(DisasterStatus.CONTAINED);
      expect(res.body.data.title).toContain('Updated:');
    });
  });

  describe('7. Disaster Deletion (DELETE)', () => {
    it('allows authenticated admin to delete disaster with HTTP 204 No Content', async () => {
      const res = await request(app)
        .delete(`/api/v1/disasters/${createdDisasterId}`)
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${adminToken}`);

      expect(res.status).toBe(204);

      // Subsequent query must return 404 Not Found
      const checkRes = await request(app).get(`/api/v1/disasters/${createdDisasterId}`);
      expect(checkRes.status).toBe(404);
      createdDisasterId = '';
    });
  });
});
