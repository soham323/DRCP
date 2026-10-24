/**
 * Disaster Response Coordination Platform (DRCP)
 * Domain Enums & Protocol Constants
 */

/**
 * Platform user access roles for hierarchical authorization (RBAC).
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER',
}

/**
 * Standard and custom HTTP header names utilized across DRCP.
 */
export enum HttpHeader {
  AUTHORIZATION = 'authorization',
  X_USER_ROLE = 'x-user-role',
  X_API_KEY = 'x-api-key',
  X_CACHE = 'X-Cache',
  X_CACHE_TTL = 'X-Cache-TTL',
}

/**
 * Cache-Aside resolution states for HTTP caching headers.
 */
export enum CacheStatus {
  HIT = 'HIT',
  MISS = 'MISS',
  DEGRADED = 'DEGRADED',
}

/**
 * Lifecycle status transitions for disaster incidents.
 */
export enum DisasterStatus {
  ACTIVE = 'ACTIVE',
  CONTAINED = 'CONTAINED',
  RESOLVED = 'RESOLVED',
}

/**
 * Emergency resource classification types.
 */
export enum ResourceType {
  SHELTER = 'SHELTER',
  HOSPITAL = 'HOSPITAL',
  FOOD = 'FOOD',
  WATER = 'WATER',
  RESCUE = 'RESCUE',
}

/**
 * Operational availability status for relief assets.
 */
export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE',
  LIMITED = 'LIMITED',
  DEPLETED = 'DEPLETED',
}

/**
 * Real-time event topics broadcast across WebSocket subscribers.
 */
export enum RealtimeEvent {
  DISASTER_CREATED = 'disaster_created',
  DISASTER_UPDATED = 'disaster_updated',
  DISASTER_DELETED = 'disaster_deleted',
  DISASTER_EVENT = 'disaster_event',
}

/**
 * Predefined mock tokens for reviewer and local development convenience.
 */
export enum MockAuthToken {
  ADMIN = 'admin-token',
  CONTRIBUTOR = 'contributor-token',
  VIEWER = 'viewer-token',
}

/**
 * Predefined API keys for seeded platform identities.
 */
export enum SeedApiKey {
  ADMIN = 'mock_test_admin_key',
  CONTRIBUTOR = 'mock_test_contributor_key',
  VIEWER = 'mock_test_viewer_key',
}

/**
 * Standard authentication schemes.
 */
export enum AuthScheme {
  BEARER = 'Bearer',
}

/**
 * Deterministic user IDs for database-seeded baseline users.
 */
export enum SeedUserId {
  ADMIN = 'admin-seed-id',
  CONTRIBUTOR = 'contributor-seed-id',
  VIEWER = 'viewer-seed-id',
}

/**
 * Deterministic user IDs for development mock token identities.
 */
export enum DevMockUserId {
  ADMIN = 'dev-admin',
  CONTRIBUTOR = 'dev-contributor',
  VIEWER = 'dev-viewer',
}

/**
 * Type guard to verify whether an unknown string maps to a valid UserRole enum.
 */
export function isValidUserRole(value: unknown): value is UserRole {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toUpperCase();
  return (Object.values(UserRole) as string[]).includes(normalized);
}

/**
 * Type-safe parser converting input string into UserRole enum, or throwing an error.
 */
export function toUserRole(value: string): UserRole | null {
  const normalized = value.trim().toUpperCase();
  if ((Object.values(UserRole) as string[]).includes(normalized)) {
    return normalized as UserRole;
  }
  return null;
}
