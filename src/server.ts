import { app } from './app';
import { config } from './config';
import { logger } from './common/logger';
import { prisma } from './common/prisma';

const server = app.listen(config.port, () => {
  logger.info(`🚀 DRCP API Server running on port ${config.port} [${config.nodeEnv}]`);
  logger.info(`👉 Health Check: http://localhost:${config.port}/health`);
  logger.info(`👉 Disasters API: http://localhost:${config.port}/api/v1/disasters`);
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  logger.info(`[Server] Received ${signal}. Initiating graceful shutdown...`);
  server.close(async () => {
    logger.info('[Server] HTTP listener closed.');
    await prisma.$disconnect();
    logger.info('[Database] Prisma disconnected. Process exiting.');
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('[Server] Forceful shutdown timeout exceeded.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
