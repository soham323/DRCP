import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/common/prisma';
import { calculateHaversineDistanceKm } from '../src/common/haversine';
import { mockSocialService } from '../src/modules/reports/mock-social-service';
import { cacheStore } from '../src/cache/memory-cache';

async function runStage2Verification() {
  console.log('====================================================');
  console.log('   DRCP STAGE 2: GEOSPATIAL & CACHING API TESTS');
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

  // 1. Haversine Math Verification
  console.log('[TEST 1] Testing Haversine Distance Formula Precision...');
  const manhattan = { latitude: 40.7831, longitude: -73.9712 };
  const midtown = { latitude: 40.7589, longitude: -73.9851 };
  const brooklyn = { latitude: 40.672, longitude: -73.953 };

  const zeroDist = calculateHaversineDistanceKm(manhattan, manhattan);
  assert(zeroDist === 0, 'Distance between identical coordinates is 0 km');

  const midtownDist = calculateHaversineDistanceKm(manhattan, midtown);
  assert(midtownDist >= 2.5 && midtownDist <= 3.2, `Manhattan to Midtown distance is ~2.8km (got ${midtownDist}km)`);

  const brooklynDist = calculateHaversineDistanceKm(manhattan, brooklyn);
  assert(brooklynDist >= 12.0 && brooklynDist <= 13.5, `Manhattan to Brooklyn distance is ~12.5km (got ${brooklynDist}km)`);

  // 2. Fetch Manhattan disaster from DB
  const disaster = await prisma.disaster.findFirst({
    where: { locationName: { contains: 'Manhattan' } },
  });
  if (!disaster) {
    throw new Error('Seed disaster in Manhattan not found. Please run seed script first.');
  }

  // 3. Test Nearby Resources Proximity (Radius = 3km)
  console.log('\n[TEST 2] Testing Proximity Search: GET /disasters/:id/resources?radius=3...');
  const res3km = await request(app).get(`/api/v1/disasters/${disaster.id}/resources?radius=3`);
  assert(res3km.status === 200, 'GET /resources returns 200 OK');
  assert(res3km.body.origin.radius_km === 3, 'Response origin metadata shows radius 3km');
  assert(res3km.body.count >= 1, 'Found nearby resources within 3km of Manhattan');
  const allWithin3km = res3km.body.data.every((r: any) => r.distance_km <= 3);
  assert(allWithin3km, 'Every returned resource has distance_km <= 3km');

  // Verify ascending order
  const isAscending = res3km.body.data.every((r: any, idx: number, arr: any[]) => {
    return idx === 0 || arr[idx - 1].distance_km <= r.distance_km;
  });
  assert(isAscending, 'Results are strictly sorted in ascending order of proximity (nearest first)');

  // 4. Test Nearby Resources Expansion (Radius = 20km)
  console.log('\n[TEST 3] Testing Expanded Radius Search: GET /disasters/:id/resources?radius=20...');
  const res20km = await request(app).get(`/api/v1/disasters/${disaster.id}/resources?radius=20`);
  assert(res20km.status === 200, 'GET /resources?radius=20 returns 200 OK');
  assert(res20km.body.count > res3km.body.count, 'Expanded radius (20km) returns more resources than 3km');
  const hasBrooklyn = res20km.body.data.some((r: any) => r.name.includes('Brooklyn') || r.name.includes('Jersey City'));
  assert(hasBrooklyn, 'Expanded radius includes regional Brooklyn and Jersey City assets');

  // 5. Test Type Filtering on Resources
  console.log('\n[TEST 4] Testing Resource Type Filtering: ?type=WATER...');
  const waterRes = await request(app).get(`/api/v1/disasters/${disaster.id}/resources?radius=25&type=WATER`);
  assert(waterRes.status === 200, 'GET /resources?type=WATER returns 200 OK');
  const allWater = waterRes.body.data.every((r: any) => r.type === 'WATER');
  assert(allWater, 'All returned resources have type WATER');

  // 6. Test Cache-Aside Hit & Miss on Community Reports
  console.log('\n[TEST 5] Testing Cache-Aside Flow on GET /disasters/:id/reports...');
  // Ensure clean cache state for this test
  await cacheStore.del(`reports:${disaster.id}`);

  // Call 1: Expect Cache Miss
  const call1 = await request(app).get(`/api/v1/disasters/${disaster.id}/reports`);
  assert(call1.status === 200, 'Call 1 returns 200 OK');
  assert(call1.headers['x-cache'] === 'MISS', 'Call 1 returns X-Cache: MISS header');
  assert(call1.body.cached === false, 'Call 1 body states cached: false');
  assert(call1.body.count >= 3, 'Normalized reports returned from external social provider');

  // Call 2: Expect Cache Hit immediately
  const call2 = await request(app).get(`/api/v1/disasters/${disaster.id}/reports`);
  assert(call2.status === 200, 'Call 2 returns 200 OK');
  assert(call2.headers['x-cache'] === 'HIT', 'Call 2 returns X-Cache: HIT header');
  assert(call2.body.cached === true, 'Call 2 body states cached: true');
  assert(call2.body.count === call1.body.count, 'Call 2 returns identical report count from cache');

  // 7. Test Circuit Breaker & Outage Resilience
  console.log('\n[TEST 6] Testing External Service Outage & Circuit-Breaker Fallback...');
  await cacheStore.del(`reports:${disaster.id}`);
  mockSocialService.setSimulateFailure(true);

  const fallbackCall = await request(app).get(`/api/v1/disasters/${disaster.id}/reports`);
  assert(fallbackCall.status === 200, 'Endpoint handles external 504 outage gracefully with HTTP 200');
  assert(fallbackCall.headers['x-cache'] === 'DEGRADED', 'Sets X-Cache: DEGRADED header on external failure');
  assert(fallbackCall.body.degraded === true, 'Response body flags degraded: true');
  assert(Array.isArray(fallbackCall.body.data), 'Returns fallback baseline reports without crashing');

  // Reset failure flag
  mockSocialService.setSimulateFailure(false);

  // 8. Test Validation Rejection on Invalid Radius
  console.log('\n[TEST 7] Testing Validation Rejection on Invalid Radius Parameter...');
  const invalidRadiusRes = await request(app).get(`/api/v1/disasters/${disaster.id}/resources?radius=-10`);
  assert(invalidRadiusRes.status === 400, 'Negative radius returns 400 Bad Request');
  assert(invalidRadiusRes.body.code === 'VALIDATION_ERROR', 'Returns code VALIDATION_ERROR');

  console.log('\n====================================================');
  console.log(`   ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS`);
  console.log('   Stage 2 Geospatial Search & Caching is verified.');
  console.log('====================================================\n');

  await prisma.$disconnect();
}

runStage2Verification().catch((err) => {
  console.error('[ERROR] Stage 2 verification failed:', err);
  process.exit(1);
});
