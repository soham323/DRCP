import { config } from '../src/config';
import { prisma } from '../src/common/prisma';
import { AppError, BadRequestError, NotFoundError } from '../src/common/errors';

async function verifyStage0() {
  console.log('🔍 ====================================================');
  console.log('   DRCP STAGE 0 COMPREHENSIVE VERIFICATION TEST');
  console.log('====================================================\n');

  // 1. Verify Configuration Loader
  console.log('1️⃣ Checking Configuration Loader...');
  console.log(`   - Port: ${config.port}`);
  console.log(`   - Environment: ${config.nodeEnv}`);
  console.log(`   - Cache Driver: ${config.cacheDriver}`);
  console.log(`   - Reports Cache TTL: ${config.reportsCacheTtl}s`);
  console.log(`   - Geo Cache TTL: ${config.geoCacheTtl}s`);
  console.log(`   - External Timeout: ${config.externalTimeoutMs}ms`);
  if (!config.port || !config.jwtSecret) {
    throw new Error('❌ Configuration check failed!');
  }
  console.log('   ✅ Configuration loaded successfully.\n');

  // 2. Verify RFC 7807 Error Classes
  console.log('2️⃣ Checking Error Hierarchy...');
  const badReq = new BadRequestError('Invalid disaster title', [{ field: 'title', message: 'Too short' }]);
  const notFound = new NotFoundError('Disaster with ID 999 not found');
  if (badReq.statusCode !== 400 || notFound.statusCode !== 404 || !(badReq instanceof AppError)) {
    throw new Error('❌ Error classes check failed!');
  }
  console.log(`   - BadRequestError: status=${badReq.statusCode}, code=${badReq.code}`);
  console.log(`   - NotFoundError: status=${notFound.statusCode}, code=${notFound.code}`);
  console.log('   ✅ Error hierarchy functioning as designed.\n');

  // 3. Verify Database Connection & Records
  console.log('3️⃣ Checking Database Tables & Seed Data (dev.db)...');
  const [users, disasters, resources, reports] = await Promise.all([
    prisma.user.findMany(),
    prisma.disaster.findMany(),
    prisma.emergencyResource.findMany(),
    prisma.communityReport.findMany(),
  ]);

  console.log(`   - Users Count: ${users.length}`);
  users.forEach((u) => console.log(`     * User: ${u.username.padEnd(12)} | Role: ${u.role}`));

  console.log(`\n   - Disasters Count: ${disasters.length}`);
  disasters.forEach((d) =>
    console.log(
      `     * [${d.status}] ${d.title} (${d.locationName}) -> [Lat: ${d.latitude}, Lng: ${d.longitude}]`
    )
  );

  console.log(`\n   - Emergency Resources Count: ${resources.length}`);
  resources.forEach((r) =>
    console.log(`     * [${r.type.padEnd(8)}] ${r.name} (${r.locationName}) -> Capacity: ${r.capacity}`)
  );

  console.log(`\n   - Community Reports Count: ${reports.length}`);
  reports.forEach((rep) => console.log(`     * "${rep.content.slice(0, 50)}..." by @${rep.author}`));

  if (users.length === 0 || disasters.length === 0 || resources.length === 0) {
    throw new Error('❌ Database appears empty! Seeding may have failed.');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL STAGE 0 FOUNDATIONAL SYSTEMS ARE WORKING 100%!');
  console.log('====================================================');

  await prisma.$disconnect();
}

verifyStage0().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
