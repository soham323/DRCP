import { PrismaClient } from '@prisma/client';
import { UserRole, SeedApiKey, SeedUserId } from '../src/common/enums';
import { hashPassword } from '../src/common/security';
import { config } from '../src/config';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting DRCP database seeding...');

  // 1. Clear existing records
  await prisma.communityReport.deleteMany();
  await prisma.emergencyResource.deleteMany();
  await prisma.disaster.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users with Scrypt Hashed Passwords sourced from environment configuration
  console.log('[Seed] Seeding Users and Roles with password hashes from environment...');
  const adminPasswordHash = await hashPassword(config.auth.admin.password);
  const contributorPasswordHash = await hashPassword(config.auth.contributor.password);
  const viewerPasswordHash = await hashPassword(config.auth.viewer.password);

  const adminUser = await prisma.user.create({
    data: {
      id: SeedUserId.ADMIN,
      username: config.auth.admin.username,
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      apiKey: config.auth.admin.apiKey,
    },
  });

  const contributorUser = await prisma.user.create({
    data: {
      id: SeedUserId.CONTRIBUTOR,
      username: config.auth.contributor.username,
      passwordHash: contributorPasswordHash,
      role: UserRole.CONTRIBUTOR,
      apiKey: config.auth.contributor.apiKey,
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      id: SeedUserId.VIEWER,
      username: config.auth.viewer.username,
      passwordHash: viewerPasswordHash,
      role: UserRole.VIEWER,
      apiKey: config.auth.viewer.apiKey,
    },
  });

  // 3. Seed Disasters
  console.log('[Seed] Seeding Disaster Incidents...');
  const manhattanDisaster = await prisma.disaster.create({
    data: {
      title: 'Flash Flood in Lower Manhattan',
      description: 'Heavy flooding has affected Manhattan, NYC with subway stations and major avenues submerged under rapid rising water.',
      locationName: 'Manhattan, NYC',
      latitude: 40.7831,
      longitude: -73.9712,
      tags: JSON.stringify(['flood', 'urgent', 'evacuation']),
      status: 'ACTIVE',
      createdBy: contributorUser.username,
    },
  });

  const mumbaiDisaster = await prisma.disaster.create({
    data: {
      title: 'Monsoon Waterlogging in Mumbai',
      description: 'Torrential monsoon downpours have caused severe waterlogging in Dadar and Kurla, Mumbai.',
      locationName: 'Mumbai, Maharashtra',
      latitude: 19.076,
      longitude: 72.8777,
      tags: JSON.stringify(['flood', 'monsoon', 'transit_halt']),
      status: 'ACTIVE',
      createdBy: contributorUser.username,
    },
  });

  const sfDisaster = await prisma.disaster.create({
    data: {
      title: 'Wildfire Smoke Hazard in Bay Area',
      description: 'Brush fires in hills surrounding San Francisco causing dangerous air quality indices.',
      locationName: 'San Francisco, CA',
      latitude: 37.7749,
      longitude: -122.4194,
      tags: JSON.stringify(['wildfire', 'smoke', 'air_quality']),
      status: 'CONTAINED',
      createdBy: adminUser.username,
    },
  });

  // 4. Seed Emergency Resources around Manhattan (various radii & types)
  console.log('[Seed] Seeding Emergency Resources...');
  await prisma.emergencyResource.createMany({
    data: [
      {
        name: 'Midtown Red Cross Emergency Shelter',
        type: 'SHELTER',
        locationName: 'Midtown Manhattan, NYC',
        latitude: 40.7589,
        longitude: -73.9851,
        capacity: 350,
        status: 'AVAILABLE',
      },
      {
        name: 'Bellevue Emergency Trauma Center',
        type: 'HOSPITAL',
        locationName: 'First Ave Manhattan, NYC',
        latitude: 40.7397,
        longitude: -73.9754,
        capacity: 120,
        status: 'AVAILABLE',
      },
      {
        name: 'Central Park South Clean Water Station',
        type: 'WATER',
        locationName: 'Central Park South, NYC',
        latitude: 40.7661,
        longitude: -73.9772,
        capacity: 8000,
        status: 'AVAILABLE',
      },
      {
        name: 'Lower East Side Community Food Pantry',
        type: 'FOOD',
        locationName: 'LES Manhattan, NYC',
        latitude: 40.718,
        longitude: -73.988,
        capacity: 2500,
        status: 'AVAILABLE',
      },
      {
        name: 'FDNY Marine Rescue Unit Pier 40',
        type: 'RESCUE',
        locationName: 'Hudson River Greenway, NYC',
        latitude: 40.7282,
        longitude: -74.0125,
        capacity: 20,
        status: 'AVAILABLE',
      },
      {
        name: 'Queens Mega Relief Hub',
        type: 'FOOD',
        locationName: 'Long Island City, Queens',
        latitude: 40.7484,
        longitude: -73.903,
        capacity: 6000,
        status: 'AVAILABLE',
      },
      {
        name: 'Brooklyn Armory Safe Haven',
        type: 'SHELTER',
        locationName: 'Crown Heights, Brooklyn',
        latitude: 40.672,
        longitude: -73.953,
        capacity: 1500,
        status: 'AVAILABLE',
      },
      {
        name: 'Jersey City Water Reservoir Supply',
        type: 'WATER',
        locationName: 'Jersey City, NJ',
        latitude: 40.7178,
        longitude: -74.0431,
        capacity: 12000,
        status: 'AVAILABLE',
      },
    ],
  });

  // 5. Seed Community Reports
  console.log('[Seed] Seeding Community Reports...');
  await prisma.communityReport.createMany({
    data: [
      {
        disasterId: manhattanDisaster.id,
        content: 'Need drinking water near 8th Ave and 42nd St Manhattan. Basements are taking on water fast.',
        author: 'citizen_nyc_12',
        source: 'social_media',
      },
      {
        disasterId: manhattanDisaster.id,
        content: 'Midtown shelter has dry cots, hot meals, and backup generators open to all.',
        author: 'volunteer_sarah',
        source: 'social_media',
      },
      {
        disasterId: manhattanDisaster.id,
        content: 'FDR Drive closed in both directions between Brooklyn Bridge and 34th St due to surging river.',
        author: 'traffic_alert_bot',
        source: 'social_media',
      },
    ],
  });

  console.log('[Seed] Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
