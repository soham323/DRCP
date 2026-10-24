import { io, Socket } from 'socket.io-client';
import { RealtimeEvent, DisasterItem } from '../types/enums';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private isConnected: boolean = false;

  public connect(): void {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.notifyConnectionState(true);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.notifyConnectionState(false);
    });

    this.socket.on('connect_error', () => {
      this.isConnected = false;
      this.notifyConnectionState(false);
    });

    // Register event hooks
    const events: RealtimeEvent[] = [
      RealtimeEvent.DISASTER_CREATED,
      RealtimeEvent.DISASTER_UPDATED,
      RealtimeEvent.DISASTER_DELETED,
    ];

    events.forEach((eventName) => {
      this.socket?.on(eventName, (payload: any) => {
        const callbacks = this.listeners.get(eventName);
        if (callbacks) {
          callbacks.forEach((cb) => cb(payload));
        }
      });
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.notifyConnectionState(false);
    }
  }

  public on(event: RealtimeEvent, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unbind function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  public onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.add(callback);
    callback(this.isConnected);
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  public getConnected(): boolean {
    return this.isConnected;
  }

  private notifyConnectionState(connected: boolean): void {
    this.connectionListeners.forEach((cb) => cb(connected));
  }
}

export const socketService = new SocketService();
