/**
 * In-Memory Cache Service
 * Provides caching functionality for API responses
 * Can be upgraded to Redis in production for distributed caching
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.hitCount = 0;
    this.missCount = 0;
    
    // Clear expired entries every 60 seconds
    setInterval(() => this.clearExpired(), 60000);
  }

  /**
   * Get value from cache
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.missCount++;
      return null;
    }

    const ttl = this.ttlMap.get(key);
    if (ttl && Date.now() > ttl) {
      this.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return this.cache.get(key);
  }

  /**
   * Set value in cache with optional TTL (in seconds)
   */
  set(key, value, ttl = 300) {
    this.cache.set(key, value);
    
    if (ttl > 0) {
      this.ttlMap.set(key, Date.now() + (ttl * 1000));
    }
    
    return true;
  }

  /**
   * Delete value from cache
   */
  delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
    return true;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.ttlMap.clear();
    this.hitCount = 0;
    this.missCount = 0;
    return true;
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, ttl] of this.ttlMap.entries()) {
      if (now > ttl) {
        this.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`🧹 Cleared ${expiredCount} expired cache entries`);
    }
  }

  /**
   * Clear cache by pattern (e.g., 'reports:*')
   */
  clearPattern(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let clearedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total * 100).toFixed(2) : 0;

    return {
      size: this.cache.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: `${hitRate}%`,
      memory: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough approximation)
   */
  estimateMemoryUsage() {
    let bytes = 0;

    for (const [key, value] of this.cache.entries()) {
      bytes += key.length * 2; // UTF-16 characters
      bytes += JSON.stringify(value).length * 2;
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }

  /**
   * Wrapper function for caching async functions
   */
  async wrap(key, ttl, fn) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    this.set(key, result, ttl);
    return result;
  }
}

// Singleton instance
const cacheService = new CacheService();

/**
 * Express middleware for caching responses
 */
function cacheMiddleware(options = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyPrefix = 'api',
    skip = () => false
  } = options;

  return (req, res, next) => {
    // Skip caching if condition met
    if (skip(req)) {
      return next();
    }

    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const key = `${keyPrefix}:${req.originalUrl || req.url}`;

    // Check cache
    const cached = cacheService.get(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data) {
      cacheService.set(key, data, ttl);
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

module.exports = {
  cacheService,
  cacheMiddleware
};
