/**
 * Shared Type-Safe Enums for DRCP Client Dashboard
 * Eliminates all raw string literals across components, state, and API requests.
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER',
}

export enum DisasterStatus {
  ACTIVE = 'ACTIVE',
  CONTAINED = 'CONTAINED',
  RESOLVED = 'RESOLVED',
}

export enum ResourceType {
  SHELTER = 'SHELTER',
  HOSPITAL = 'HOSPITAL',
  FOOD = 'FOOD',
  WATER = 'WATER',
  RESCUE_TEAM = 'RESCUE_TEAM',
}

export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE',
  DEPLOYED = 'DEPLOYED',
  DEPLETED = 'DEPLETED',
}

export enum RealtimeEvent {
  DISASTER_CREATED = 'disaster_created',
  DISASTER_UPDATED = 'disaster_updated',
  DISASTER_DELETED = 'disaster_deleted',
}

export enum CacheStatus {
  HIT = 'HIT',
  MISS = 'MISS',
  DEGRADED = 'DEGRADED',
}

export enum HttpHeader {
  AUTHORIZATION = 'Authorization',
  X_API_KEY = 'x-api-key',
  X_CACHE = 'x-cache',
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationObject {
  name: string;
  latitude: number;
  longitude: number;
}

export interface DisasterItem {
  id: string;
  title: string;
  description: string;
  location: LocationObject;
  tags: string[];
  status: DisasterStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyResourceItem {
  id: string;
  name: string;
  type: ResourceType;
  location: LocationObject;
  capacity: number;
  status: ResourceStatus;
  distance_km?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityReportItem {
  id: string;
  content: string;
  author: string;
  source: string;
  timestamp: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  verified?: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}
