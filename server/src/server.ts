import http from 'http';
import { app } from './app';
import { config } from './config';
import { logger } from './common/logger';
import { prisma } from './common/prisma';
import { initSocketServer } from './realtime/socket';

const httpServer = http.createServer(app);
export const io = initSocketServer(httpServer);

const server = httpServer.listen(config.port, () => {
  logger.info(`[Server] DRCP API Server listening on port ${config.port} [env: ${config.nodeEnv}]`);
  logger.info(`[Server] Health Check available at http://localhost:${config.port}/health`);
  logger.info(`[Server] Disasters API available at http://localhost:${config.port}/api/v1/disasters`);
  logger.info(`[Server] Real-time updates active at ws://localhost:${config.port}/socket.io/`);
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
