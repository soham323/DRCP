import { LRUCache } from 'lru-cache';
import { CacheStore } from './cache.interface';
import { logger } from '../common/logger';

export class MemoryCacheStore implements CacheStore {
  private cache: LRUCache<string, any>;

  constructor(maxItems = 1000, defaultTtlSeconds = 120) {
    this.cache = new LRUCache<string, any>({
      max: maxItems,
      ttl: defaultTtlSeconds * 1000, // milliseconds
      updateAgeOnGet: false,
    });
    logger.info(`[Cache] MemoryCacheStore initialized (max: ${maxItems}, default TTL: ${defaultTtlSeconds}s)`);
  }

  public async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get(key) as T | undefined;
    if (value === undefined) {
      return null;
    }
    return value;
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttlMs = ttlSeconds !== undefined ? ttlSeconds * 1000 : undefined;
    this.cache.set(key, value, { ttl: ttlMs });
  }

  public async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  public async clear(): Promise<void> {
    this.cache.clear();
  }

  public async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }
}

export const cacheStore: CacheStore = new MemoryCacheStore();
