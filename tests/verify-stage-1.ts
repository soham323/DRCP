import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/common/prisma';
import { HttpHeader, UserRole, DisasterStatus, SeedApiKey } from '../src/common/enums';

async function runStage1Verification() {
  console.log('====================================================');
  console.log('   DRCP STAGE 1: CORE DISASTER MANAGEMENT API TESTS');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition: boolean, testName: string, details?: any) => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${testName}`);
    } else {
      console.error(`  [FAIL] ${testName}`, details || '');
      throw new Error(`Test failed: ${testName}`);
    }
  };

  // Test 1: Health check
  console.log('[TEST 1] Testing Server Health Check...');
  const healthRes = await request(app).get('/health');
  assert(healthRes.status === 200 && healthRes.body.status === 'ok', 'GET /health returns 200 OK');

  // Test 2: Natural Language Geocoding extraction (The core assignment requirement)
  console.log('\n[TEST 2] Testing Natural Language Location Resolution on POST /api/v1/disasters...');
  const geocodePayload = {
    title: 'Severe Flash Flooding Event',
    description: 'Heavy flooding has affected Manhattan, NYC with subway stations submerged under rapidly rising water.',
    tags: ['flood', 'urgent', 'evacuation'],
    status: DisasterStatus.ACTIVE,
  };

  const createGeoRes = await request(app)
    .post('/api/v1/disasters')
    .set(HttpHeader.X_API_KEY, SeedApiKey.ADMIN)
    .send(geocodePayload);
  assert(createGeoRes.status === 201, 'POST /disasters returns 201 Created');
  assert(
    createGeoRes.body.data.location.name === 'Manhattan, NYC',
    'NLP extracted "Manhattan, NYC" correctly from narrative text',
    createGeoRes.body.data.location
  );
  assert(
    createGeoRes.body.data.location.latitude === 40.7831 &&
      createGeoRes.body.data.location.longitude === -73.9712,
    'Geocoded coordinates resolved to Manhattan coordinates [40.7831, -73.9712]',
    createGeoRes.body.data.location
  );
  assert(createGeoRes.body.data.status === DisasterStatus.ACTIVE, 'Disaster status defaults to ACTIVE');
  const createdDisasterId = createGeoRes.body.data.id;

  // Test 3: Validation Error Handling (RFC 7807 problem details)
  console.log('\n[TEST 3] Testing Input Validation on Malformed POST Payload...');
  const invalidPayload = {
    title: 'A', // Too short (min 3)
    description: 'short', // Too short (min 10)
  };

  const invalidRes = await request(app)
    .post('/api/v1/disasters')
    .set(HttpHeader.X_API_KEY, SeedApiKey.ADMIN)
    .send(invalidPayload);
  assert(invalidRes.status === 400, 'Invalid payload returns 400 Bad Request');
  assert(invalidRes.body.code === 'VALIDATION_ERROR', 'Returns code VALIDATION_ERROR');
  assert(
    Array.isArray(invalidRes.body.errors) && invalidRes.body.errors.length >= 2,
    'Returns granular validation errors array for each field',
    invalidRes.body.errors
  );

  // Test 4: List Disasters & Pagination
  console.log('\n[TEST 4] Testing GET /api/v1/disasters (Pagination and Structure)...');
  const listRes = await request(app).get('/api/v1/disasters?limit=5&offset=0');
  assert(listRes.status === 200, 'GET /disasters returns 200 OK');
  assert(listRes.body.meta.total >= 4, 'Meta total count reflects database total');
  assert(listRes.body.meta.limit === 5, 'Meta limit reflects query parameter');
  assert(Array.isArray(listRes.body.data), 'Data field is an array of disasters');

  // Test 5: Tag Filtering
  console.log('\n[TEST 5] Testing Tag Filtering: GET /api/v1/disasters?tag=flood...');
  const tagRes = await request(app).get('/api/v1/disasters?tag=flood');
  assert(tagRes.status === 200, 'Tag filter returns 200 OK');
  const allHaveFloodTag = tagRes.body.data.every((d: any) => d.tags.includes('flood'));
  assert(allHaveFloodTag, 'Every disaster in results contains requested "flood" tag');

  // Test 6: Status Filtering
  console.log('\n[TEST 6] Testing Status Filtering: GET /api/v1/disasters?status=ACTIVE...');
  const statusRes = await request(app).get(`/api/v1/disasters?status=${DisasterStatus.ACTIVE}`);
  assert(statusRes.status === 200, 'Status filter returns 200 OK');
  const allActive = statusRes.body.data.every((d: any) => d.status === DisasterStatus.ACTIVE);
  assert(allActive, 'Every disaster in results has status ACTIVE');

  // Test 7: Get Single Disaster by ID
  console.log('\n[TEST 7] Testing GET /api/v1/disasters/:id...');
  const singleRes = await request(app).get(`/api/v1/disasters/${createdDisasterId}`);
  assert(singleRes.status === 200, 'Returns 200 OK for existing disaster');
  assert(singleRes.body.data.id === createdDisasterId, 'Returned entity ID matches requested ID');

  // Test 8: 404 on Unknown Disaster
  console.log('\n[TEST 8] Testing 404 Not Found for Non-Existent ID...');
  const notFoundRes = await request(app).get('/api/v1/disasters/00000000-0000-0000-0000-000000000000');
  assert(notFoundRes.status === 404, 'Returns 404 Not Found for non-existent UUID');
  assert(notFoundRes.body.code === 'NOT_FOUND', 'Returns code NOT_FOUND');

  // Test 9: Update Disaster (PATCH)
  console.log('\n[TEST 9] Testing PATCH /api/v1/disasters/:id...');
  const updateRes = await request(app)
    .patch(`/api/v1/disasters/${createdDisasterId}`)
    .set(HttpHeader.X_API_KEY, SeedApiKey.ADMIN)
    .send({
      status: DisasterStatus.CONTAINED,
      title: 'Updated: Flash Flood Lower Manhattan (Controlled)',
    });
  assert(updateRes.status === 200, 'PATCH returns 200 OK');
  assert(updateRes.body.data.status === DisasterStatus.CONTAINED, 'Status updated to CONTAINED');
  assert(updateRes.body.data.title.includes('Updated:'), 'Title updated successfully');

  // Test 10: Delete Disaster (DELETE)
  console.log('\n[TEST 10] Testing DELETE /api/v1/disasters/:id...');
  const deleteRes = await request(app)
    .delete(`/api/v1/disasters/${createdDisasterId}`)
    .set(HttpHeader.X_API_KEY, SeedApiKey.ADMIN);
  assert(deleteRes.status === 204, 'DELETE returns 204 No Content');

  // Confirm deletion
  const verifyDeleteRes = await request(app).get(`/api/v1/disasters/${createdDisasterId}`);
  assert(verifyDeleteRes.status === 404, 'Subsequent GET on deleted disaster returns 404 Not Found');

  console.log('\n====================================================');
  console.log(`   ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY`);
  console.log('   Stage 1 Core Disaster API is verified and operational.');
  console.log('====================================================\n');

  await prisma.$disconnect();
}

runStage1Verification().catch((err) => {
  console.error('[ERROR] Stage 1 verification failed:', err);
  process.exit(1);
});
