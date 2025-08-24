# LIN-016: Implement Caching Layer

**Status**: `todo`  
**Priority**: `low`  
**Estimate**: M (3 points)  
**Labels**: `technical-debt`, `performance`, `optimization`  
**Team**: Engineering  

## Description

Implement a caching layer to reduce API calls, improve performance, and handle rate limits more effectively.

## Implementation Details

### File: `src/atoms/cache/cache-manager.ts`

```typescript
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size in items
  strategy?: 'LRU' | 'LFU' | 'FIFO';
  persistent?: boolean; // Use disk storage
}

export class CacheManager {
  private caches = new Map<string, Cache<any>>();
  
  createCache<T>(name: string, options?: CacheOptions): Cache<T> {
    const cache = new Cache<T>(options);
    this.caches.set(name, cache);
    return cache;
  }
  
  getCache<T>(name: string): Cache<T> | undefined {
    return this.caches.get(name);
  }
  
  async clearAll(): Promise<void> {
    for (const cache of this.caches.values()) {
      await cache.clear();
    }
  }
  
  getStats(): CacheStatistics {
    return {
      caches: Array.from(this.caches.entries()).map(([name, cache]) => ({
        name,
        ...cache.getStats(),
      })),
    };
  }
}
```

### File: `src/atoms/cache/cache.ts`

```typescript
export class Cache<T> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private accessCount = new Map<string, number>();
  
  constructor(private options: CacheOptions = {}) {
    this.options = {
      ttl: 300, // 5 minutes default
      maxSize: 1000,
      strategy: 'LRU',
      ...options,
    };
  }
  
  async get(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }
    
    this.updateAccessTracking(key);
    return entry.value;
  }
  
  async set(key: string, value: T, ttl?: number): Promise<void> {
    if (this.store.size >= this.options.maxSize!) {
      this.evict();
    }
    
    this.store.set(key, {
      value,
      createdAt: Date.now(),
      ttl: ttl || this.options.ttl!,
    });
  }
  
  async getOrSet(
    key: string, 
    factory: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = await this.get(key);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }
  
  invalidate(pattern: string | RegExp): number {
    let count = 0;
    
    for (const key of this.store.keys()) {
      if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
        this.store.delete(key);
        this.accessCount.delete(key);
        count++;
      }
    }
    
    return count;
  }
  
  private evict(): void {
    switch (this.options.strategy) {
      case 'LRU':
        this.evictLRU();
        break;
      case 'LFU':
        this.evictLFU();
        break;
      case 'FIFO':
        this.evictFIFO();
        break;
    }
  }
}
```

### File: `src/atoms/cache/decorators.ts`

```typescript
export function Cacheable(options?: CacheableOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cacheKey = `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = async function (...args: any[]) {
      const cache = cacheManager.getCache(cacheKey) || 
                   cacheManager.createCache(cacheKey, options);
      
      const key = options?.keyGenerator 
        ? options.keyGenerator(...args)
        : JSON.stringify(args);
      
      return await cache.getOrSet(
        key,
        () => originalMethod.apply(this, args),
        options?.ttl
      );
    };
    
    return descriptor;
  };
}

export function InvalidateCache(pattern?: string | RegExp) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      // Invalidate related caches
      for (const [name, cache] of cacheManager.caches) {
        if (!pattern || name.match(pattern)) {
          cache.invalidate(pattern || '');
        }
      }
      
      return result;
    };
    
    return descriptor;
  };
}
```

### Integration with Services

```typescript
export class IssueService {
  @Cacheable({ ttl: 300, keyGenerator: (id) => `issue:${id}` })
  async get(id: string): Promise<Issue | null> {
    // Original implementation
  }
  
  @Cacheable({ ttl: 60 })
  async list(filter?: IssueFilter, pagination?: Pagination): Promise<IssueConnection> {
    // Original implementation
  }
  
  @InvalidateCache(/issue/)
  async update(id: string, data: IssueUpdate): Promise<Issue> {
    // Original implementation - cache invalidated after update
  }
}
```

### File: `src/atoms/cache/persistent-cache.ts`

```typescript
export class PersistentCache<T> extends Cache<T> {
  private dbPath: string;
  
  constructor(name: string, options: CacheOptions) {
    super(options);
    this.dbPath = path.join(process.cwd(), '.cache', `${name}.db`);
    this.loadFromDisk();
  }
  
  async set(key: string, value: T, ttl?: number): Promise<void> {
    await super.set(key, value, ttl);
    await this.saveToDisk();
  }
  
  private async loadFromDisk(): Promise<void> {
    try {
      const data = await fs.readFile(this.dbPath, 'utf-8');
      const entries = JSON.parse(data);
      // Restore cache entries
    } catch (error) {
      // Cache file doesn't exist or is corrupted
    }
  }
  
  private async saveToDisk(): Promise<void> {
    const data = Array.from(this.store.entries());
    await fs.writeFile(this.dbPath, JSON.stringify(data));
  }
}
```

## Acceptance Criteria

- [ ] In-memory cache with TTL support
- [ ] Multiple eviction strategies (LRU, LFU, FIFO)
- [ ] Cache decorators for easy integration
- [ ] Cache invalidation patterns
- [ ] Persistent cache option
- [ ] Cache statistics and monitoring
- [ ] Key generation strategies
- [ ] Batch cache operations
- [ ] Unit tests for cache operations
- [ ] Performance benchmarks

## Dependencies

- Node.js fs for persistent cache
- Memory management utilities

## Notes

- Default TTL: 5 minutes for most data
- Shorter TTL for frequently changing data
- Consider memory limits in production
- Cache invalidation is critical for consistency
- Monitor cache hit/miss ratios