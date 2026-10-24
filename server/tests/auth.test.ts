import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/common/prisma';
import { hashPassword, verifyPassword } from '../src/common/security';
import { config } from '../src/config';
import {
  UserRole,
  HttpHeader,
  AuthScheme,
  DisasterStatus,
} from '../src/common/enums';

describe('Authentication & Role-Based Access Control (RBAC) Suite', () => {
  let adminToken: string;
  let contributorToken: string;
  let viewerToken: string;
  let createdDisasterId: string;

  beforeAll(async () => {
    // 1. Authenticate seeded users to obtain verified JWT tokens
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: config.auth.admin.username,
        password: config.auth.admin.password,
      });
    expect(adminLoginRes.status).toBe(200);
    expect(adminLoginRes.body.user.role).toBe(UserRole.ADMIN);
    adminToken = adminLoginRes.body.token;

    const contribLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: config.auth.contributor.username,
        password: config.auth.contributor.password,
      });
    expect(contribLoginRes.status).toBe(200);
    expect(contribLoginRes.body.user.role).toBe(UserRole.CONTRIBUTOR);
    contributorToken = contribLoginRes.body.token;

    const viewerLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: config.auth.viewer.username,
        password: config.auth.viewer.password,
      });
    expect(viewerLoginRes.status).toBe(200);
    expect(viewerLoginRes.body.user.role).toBe(UserRole.VIEWER);
    viewerToken = viewerLoginRes.body.token;
  });

  afterAll(async () => {
    // Cleanup any created test records and disconnect Prisma
    if (createdDisasterId) {
      await prisma.disaster.deleteMany({
        where: { id: createdDisasterId },
      });
    }
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'test_agent_' } },
    });
    await prisma.$disconnect();
  });

  describe('1. Cryptographic Password Hashing Utility', () => {
    it('generates a valid salt:hash format using scrypt', async () => {
      const rawPassword = config.auth.testUserPassword;
      const hash = await hashPassword(rawPassword);

      expect(typeof hash).toBe('string');
      const parts = hash.split(':');
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBe(32); // 16 bytes in hex = 32 chars
      expect(parts[1].length).toBe(128); // 64 bytes in hex = 128 chars
    });

    it('verifies a matching password against stored hash', async () => {
      const rawPassword = config.auth.testUserPassword;
      const hash = await hashPassword(rawPassword);
      const isMatch = await verifyPassword(rawPassword, hash);

      expect(isMatch).toBe(true);
    });

    it('rejects an incorrect password', async () => {
      const rawPassword = config.auth.testUserPassword;
      const hash = await hashPassword(rawPassword);
      const isMatch = await verifyPassword(`${config.auth.testUserPassword}_incorrect`, hash);

      expect(isMatch).toBe(false);
    });

    it('returns false for malformed hash strings without crashing', async () => {
      const isMatch = await verifyPassword(config.auth.testUserPassword, 'malformed_hash_without_delimiter');
      expect(isMatch).toBe(false);
    });
  });

  describe('2. User Registration (POST /api/v1/auth/register)', () => {
    const dynamicUsername = `test_agent_${Date.now()}`;

    it('successfully registers a new account and assigns CONTRIBUTOR role by system policy', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: dynamicUsername,
          password: config.auth.testUserPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.tokenType).toBe(AuthScheme.BEARER);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user.role).toBe(UserRole.CONTRIBUTOR);
      expect(res.body.user.username).toBe(dynamicUsername);

      // Verify the user was created in DB with hashed password (never plain text)
      const dbUser = await prisma.user.findUnique({
        where: { username: dynamicUsername },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.passwordHash).not.toBe(config.auth.testUserPassword);
      expect(dbUser?.passwordHash).toContain(':');
    });

    it('allows user to explicitly register with VIEWER role', async () => {
      const viewerUsername = `test_agent_viewer_${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: viewerUsername,
          password: config.auth.testUserPassword,
          role: UserRole.VIEWER,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.user.role).toBe(UserRole.VIEWER);
      expect(res.body.user.username).toBe(viewerUsername);
    });

    it('allows user to explicitly register with CONTRIBUTOR role', async () => {
      const contribUsername = `test_agent_contrib_${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: contribUsername,
          password: config.auth.testUserPassword,
          role: UserRole.CONTRIBUTOR,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.user.role).toBe(UserRole.CONTRIBUTOR);
      expect(res.body.user.username).toBe(contribUsername);
    });

    it('rejects registration when attempting to self-assign ADMIN role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: `test_agent_admin_${Date.now()}`,
          password: config.auth.testUserPassword,
          role: 'ADMIN',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('rejects registration with a duplicate username with HTTP 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: dynamicUsername,
          password: config.auth.testUserPassword,
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
    });

    it('rejects registration when password is shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: `short_pw_${Date.now()}`,
          password: config.auth.testUserPassword.slice(0, 3),
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('rejects registration when username is shorter than 3 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'ab',
          password: config.auth.testUserPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });
  });

  describe('3. Credentialed Login (POST /api/v1/auth/login)', () => {
    it('returns HTTP 401 Unauthorized when user does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'non_existent_user_99999',
          password: config.auth.testUserPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('returns HTTP 401 Unauthorized when password does not match hash', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: config.auth.admin.username,
          password: `${config.auth.admin.password}_wrong`,
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('successfully logs in with valid admin credentials and returns role ADMIN', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: config.auth.admin.username,
          password: config.auth.admin.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.user.role).toBe(UserRole.ADMIN);
      expect(res.body.token).toBeDefined();
    });

    it('successfully logs in with contributor credentials and returns role CONTRIBUTOR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: config.auth.contributor.username,
          password: config.auth.contributor.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe(UserRole.CONTRIBUTOR);
    });

    it('successfully logs in with viewer credentials and returns role VIEWER', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: config.auth.viewer.username,
          password: config.auth.viewer.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe(UserRole.VIEWER);
    });
  });

  describe('4. Identity Profile & Forging Rejection (GET /api/v1/auth/me)', () => {
    it('returns HTTP 401 Unauthorized for unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('strictly rejects requests attempting to self-claim role via header without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(HttpHeader.X_USER_ROLE, UserRole.ADMIN);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('returns verified database profile when Bearer JWT is supplied', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.authenticated).toBe(true);
      expect(res.body.data.user.username).toBe(config.auth.admin.username);
      expect(res.body.data.user.role).toBe(UserRole.ADMIN);
    });

    it('returns verified profile when database API key is provided via header', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(HttpHeader.X_API_KEY, config.auth.admin.apiKey);

      expect(res.status).toBe(200);
      expect(res.body.data.authenticated).toBe(true);
      expect(res.body.data.user.role).toBe(UserRole.ADMIN);
    });

    it('rejects an invalid or malformed Bearer token with HTTP 401', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} invalid.bogus.jwt`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('5. RBAC Permission Matrix & Mutation Authorization', () => {
    it('allows public unauthenticated read access to disasters list', async () => {
      const res = await request(app).get('/api/v1/disasters');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('rejects unauthenticated attempts to create a disaster with HTTP 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/disasters')
        .send({
          title: 'Unauthenticated Incident Attempt',
          description: 'This disaster incident must be rejected by middleware.',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects VIEWER role from creating a disaster with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/disasters')
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${viewerToken}`)
        .send({
          title: 'Viewer Forbidden Incident',
          description: 'Viewer role must not possess disaster creation privileges.',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('allows CONTRIBUTOR role to create a new disaster', async () => {
      const res = await request(app)
        .post('/api/v1/disasters')
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${contributorToken}`)
        .send({
          title: 'RBAC Test Disaster in Manhattan',
          description: 'Flash flooding reported in Manhattan, NYC near Times Square.',
          tags: ['test', 'rbac'],
          status: DisasterStatus.ACTIVE,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      createdDisasterId = res.body.data.id;
    });

    it('allows CONTRIBUTOR role to update a disaster', async () => {
      const res = await request(app)
        .patch(`/api/v1/disasters/${createdDisasterId}`)
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${contributorToken}`)
        .send({
          status: DisasterStatus.CONTAINED,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(DisasterStatus.CONTAINED);
    });

    it('strictly forbids CONTRIBUTOR role from deleting a disaster with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/v1/disasters/${createdDisasterId}`)
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${contributorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('strictly forbids VIEWER role from deleting a disaster with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/v1/disasters/${createdDisasterId}`)
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${viewerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('allows ADMIN role to delete a disaster with HTTP 204 No Content', async () => {
      const res = await request(app)
        .delete(`/api/v1/disasters/${createdDisasterId}`)
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify incident is gone
      const checkRes = await request(app).get(`/api/v1/disasters/${createdDisasterId}`);
      expect(checkRes.status).toBe(404);
      createdDisasterId = ''; // Cleared so afterAll doesn't try to delete again
    });
  });

  describe('6. User Logout (POST /api/v1/auth/logout)', () => {
    it('returns HTTP 200 OK confirming logout instructions', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set(HttpHeader.AUTHORIZATION, `${AuthScheme.BEARER} ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('Logged out successfully');
    });
  });
});
