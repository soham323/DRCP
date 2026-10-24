import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../common/logger';
import { FormattedDisaster } from '../modules/disasters/disaster.repository';
import { RealtimeEvent } from '../common/enums';

export { RealtimeEvent };

export interface DisasterRealtimeEvent {
  event: RealtimeEvent;
  timestamp: string;
  data: FormattedDisaster | { id: string };
}

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io instance attached to the provided HTTP server.
 */
export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`[Socket.io] Client connected: ${socket.id} (active clients: ${io?.engine.clientsCount || 1})`);

    // Channel subscription for incident-specific updates
    socket.on('join_incident', (incidentId: string) => {
      socket.join(`incident:${incidentId}`);
      logger.info(`[Socket.io] Client ${socket.id} joined incident channel: ${incidentId}`);
    });

    socket.on('leave_incident', (incidentId: string) => {
      socket.leave(`incident:${incidentId}`);
      logger.info(`[Socket.io] Client ${socket.id} left incident channel: ${incidentId}`);
    });

    socket.on('disconnect', (reason: string) => {
      logger.info(`[Socket.io] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info('[Socket.io] Real-time engine initialized successfully.');
  return io;
}

/**
 * Retrieve the active Socket.io server instance.
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Broadcast disaster_created event across all connected clients.
 */
export function emitDisasterCreated(disaster: FormattedDisaster): void {
  if (!io) {
    logger.warn('[Socket.io] Cannot broadcast disaster_created: socket server not initialized');
    return;
  }
  const payload: DisasterRealtimeEvent = {
    event: RealtimeEvent.DISASTER_CREATED,
    timestamp: new Date().toISOString(),
    data: disaster,
  };
  io.emit(RealtimeEvent.DISASTER_CREATED, payload);
  io.emit(RealtimeEvent.DISASTER_EVENT, payload);
  logger.info(`[Socket.io] Broadcasted disaster_created event for incident: ${disaster.id}`);
}

/**
 * Broadcast disaster_updated event across all connected clients.
 */
export function emitDisasterUpdated(disaster: FormattedDisaster): void {
  if (!io) {
    logger.warn('[Socket.io] Cannot broadcast disaster_updated: socket server not initialized');
    return;
  }
  const payload: DisasterRealtimeEvent = {
    event: RealtimeEvent.DISASTER_UPDATED,
    timestamp: new Date().toISOString(),
    data: disaster,
  };
  io.emit(RealtimeEvent.DISASTER_UPDATED, payload);
  io.emit(RealtimeEvent.DISASTER_EVENT, payload);
  // Also send to incident-specific subscribers
  io.to(`incident:${disaster.id}`).emit('incident_updated', payload);
  logger.info(`[Socket.io] Broadcasted disaster_updated event for incident: ${disaster.id}`);
}

/**
 * Broadcast disaster_deleted event across all connected clients.
 */
export function emitDisasterDeleted(id: string): void {
  if (!io) {
    logger.warn('[Socket.io] Cannot broadcast disaster_deleted: socket server not initialized');
    return;
  }
  const payload: DisasterRealtimeEvent = {
    event: RealtimeEvent.DISASTER_DELETED,
    timestamp: new Date().toISOString(),
    data: { id },
  };
  io.emit(RealtimeEvent.DISASTER_DELETED, payload);
  io.emit(RealtimeEvent.DISASTER_EVENT, payload);
  logger.info(`[Socket.io] Broadcasted disaster_deleted event for incident: ${id}`);
}
