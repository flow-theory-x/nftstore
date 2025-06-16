interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface StorageCache {
  get<T>(key: string): T | null;
  set<T>(key: string, data: T, ttl?: number): void;
  remove(key: string): void;
  clear(): void;
}

class MemoryCache implements StorageCache {
  private cache = new Map<string, CacheItem<any>>();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now > item.timestamp + item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

class LocalStorageCache implements StorageCache {
  private prefix = 'nft_cache_';

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed: CacheItem<T> = JSON.parse(item);
      const now = Date.now();
      
      if (now > parsed.timestamp + parsed.ttl) {
        this.remove(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('LocalStorageCache get error:', error);
      return null;
    }
  }

  set<T>(key: string, data: T, ttl: number = 30 * 60 * 1000): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('LocalStorageCache set error:', error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('LocalStorageCache remove error:', error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('LocalStorageCache clear error:', error);
    }
  }
}

export class CacheService {
  private memoryCache = new MemoryCache();
  private localStorageCache = new LocalStorageCache();

  // Contract metadata cache (in memory, 5 minutes TTL)
  getContractData<T>(contractAddress: string, method: string): T | null {
    const key = `contract_${contractAddress}_${method}`;
    return this.memoryCache.get<T>(key);
  }

  setContractData<T>(contractAddress: string, method: string, data: T): void {
    const key = `contract_${contractAddress}_${method}`;
    this.memoryCache.set(key, data, 5 * 60 * 1000); // 5 minutes
  }

  // Token metadata cache (localStorage, 30 minutes TTL)
  getTokenMetadata(tokenURI: string): any | null {
    const key = `metadata_${this.hashString(tokenURI)}`;
    return this.localStorageCache.get(key);
  }

  setTokenMetadata(tokenURI: string, metadata: any): void {
    const key = `metadata_${this.hashString(tokenURI)}`;
    this.localStorageCache.set(key, metadata, 30 * 60 * 1000); // 30 minutes
  }

  // Token info cache (in memory, 2 minutes TTL)
  getTokenInfo(contractAddress: string, tokenId: string): any | null {
    const key = `token_${contractAddress}_${tokenId}`;
    return this.memoryCache.get(key);
  }

  setTokenInfo(contractAddress: string, tokenId: string, info: any): void {
    const key = `token_${contractAddress}_${tokenId}`;
    this.memoryCache.set(key, info, 2 * 60 * 1000); // 2 minutes
  }

  // Owner info cache (in memory, 1 minute TTL for more frequent updates)
  getOwnerInfo(contractAddress: string, tokenId: string): string | null {
    const key = `owner_${contractAddress}_${tokenId}`;
    return this.memoryCache.get(key);
  }

  setOwnerInfo(contractAddress: string, tokenId: string, owner: string): void {
    const key = `owner_${contractAddress}_${tokenId}`;
    this.memoryCache.set(key, owner, 1 * 60 * 1000); // 1 minute
  }

  // Batch token data cache
  getBatchTokens(contractAddress: string, startIndex: number, batchSize: number): any | null {
    const key = `batch_${contractAddress}_${startIndex}_${batchSize}`;
    return this.memoryCache.get(key);
  }

  setBatchTokens(contractAddress: string, startIndex: number, batchSize: number, tokens: any): void {
    const key = `batch_${contractAddress}_${startIndex}_${batchSize}`;
    this.memoryCache.set(key, tokens, 1 * 60 * 1000); // 1 minute
  }

  // Clear all cache
  clearAll(): void {
    this.memoryCache.clear();
    this.localStorageCache.clear();
  }

  // Clear specific contract cache
  clearContract(contractAddress: string): void {
    // Clear memory cache items for this contract
    const memoryCache = (this.memoryCache as any).cache;
    for (const [key] of memoryCache) {
      if (key.includes(contractAddress)) {
        this.memoryCache.remove(key.replace('nft_cache_', ''));
      }
    }

    // Clear localStorage cache items for this contract
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('nft_cache_') && key.includes(contractAddress)) {
        localStorage.removeItem(key);
      }
    });
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

export const cacheService = new CacheService();