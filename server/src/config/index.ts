import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  cacheDriver: 'memory' | 'redis';
  redisUrl: string;
  reportsCacheTtl: number;
  geoCacheTtl: number;
  externalTimeoutMs: number;
  auth: {
    admin: {
      username: string;
      password: string;
      apiKey: string;
    };
    contributor: {
      username: string;
      password: string;
      apiKey: string;
    };
    viewer: {
      username: string;
      password: string;
      apiKey: string;
    };
    testUserPassword: string;
  };
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-placeholder-change-in-production',
  cacheDriver: (process.env.CACHE_DRIVER as 'memory' | 'redis') || 'memory',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  reportsCacheTtl: parseInt(process.env.REPORTS_CACHE_TTL || '120', 10),
  geoCacheTtl: parseInt(process.env.GEO_CACHE_TTL || '86400', 10),
  externalTimeoutMs: parseInt(process.env.EXTERNAL_TIMEOUT_MS || '3000', 10),
  auth: {
    admin: {
      username: process.env.SEED_ADMIN_USERNAME || 'admin',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
      apiKey: process.env.SEED_ADMIN_API_KEY || 'mock_test_admin_key',
    },
    contributor: {
      username: process.env.SEED_CONTRIBUTOR_USERNAME || 'contributor',
      password: process.env.SEED_CONTRIBUTOR_PASSWORD || 'Contributor@123',
      apiKey: process.env.SEED_CONTRIBUTOR_API_KEY || 'mock_test_contributor_key',
    },
    viewer: {
      username: process.env.SEED_VIEWER_USERNAME || 'viewer',
      password: process.env.SEED_VIEWER_PASSWORD || 'Viewer@123',
      apiKey: process.env.SEED_VIEWER_API_KEY || 'mock_test_viewer_key',
    },
    testUserPassword: process.env.TEST_USER_PASSWORD || 'TestSecurePass@123',
  },
};

