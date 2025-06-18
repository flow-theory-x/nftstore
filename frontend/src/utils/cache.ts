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

  // Contract metadata cache (localStorage, 30 minutes TTL)
  getContractData<T>(contractAddress: string, method: string): T | null {
    const key = `contract_${contractAddress}_${method}`;
    return this.localStorageCache.get<T>(key);
  }

  setContractData<T>(contractAddress: string, method: string, data: T, ttl?: number): void {
    const key = `contract_${contractAddress}_${method}`;
    const defaultTtl = method === 'allTokenIds' ? 1 * 60 * 1000 : 30 * 60 * 1000; // allTokenIds: 1分, その他: 30分
    this.localStorageCache.set(key, data, ttl || defaultTtl);
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

  // Token info cache (localStorage, 10 minutes TTL)
  getTokenInfo(contractAddress: string, tokenId: string): any | null {
    const key = `token_${contractAddress}_${tokenId}`;
    return this.localStorageCache.get(key);
  }

  setTokenInfo(contractAddress: string, tokenId: string, info: any): void {
    const key = `token_${contractAddress}_${tokenId}`;
    this.localStorageCache.set(key, info, 10 * 60 * 1000); // 10 minutes
  }

  // Owner info cache (localStorage, 5 minutes TTL for more frequent updates)
  getOwnerInfo(contractAddress: string, tokenId: string): string | null {
    const key = `owner_${contractAddress}_${tokenId}`;
    return this.localStorageCache.get(key);
  }

  setOwnerInfo(contractAddress: string, tokenId: string, owner: string): void {
    const key = `owner_${contractAddress}_${tokenId}`;
    this.localStorageCache.set(key, owner, 5 * 60 * 1000); // 5 minutes
  }

  // Batch token data cache (localStorage, 3 minutes TTL)
  getBatchTokens(contractAddress: string, startIndex: number, batchSize: number): any | null {
    const key = `batch_${contractAddress}_${startIndex}_${batchSize}`;
    return this.localStorageCache.get(key);
  }

  setBatchTokens(contractAddress: string, startIndex: number, batchSize: number, tokens: any): void {
    const key = `batch_${contractAddress}_${startIndex}_${batchSize}`;
    this.localStorageCache.set(key, tokens, 3 * 60 * 1000); // 3 minutes
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

  // Clear TBA-related cache data specifically
  clearTBACache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('nft_cache_') && (
          key.includes('account_') ||
          key.includes('tba_') ||
          key.includes('is_tba_') ||
          key.includes('deployed_') ||
          key.includes('balance_') ||
          key.includes('owner_') ||
          key.includes('tba_source_') ||
          key.includes('tba_tokens_')
        )) {
          console.log('🗑️ Clearing TBA cache key:', key);
          localStorage.removeItem(key);
        }
      });
      console.log('✅ TBA cache cleared');
    } catch (error) {
      console.warn('TBA cache clear error:', error);
    }
  }

  // Debug method to show all cached TBA data
  debugTBACache(): void {
    console.group('🔍 TBA Cache Debug');
    try {
      const keys = Object.keys(localStorage);
      const tbaKeys = keys.filter(key => 
        key.includes('nft_cache_') && (
          key.includes('account_') ||
          key.includes('tba_') ||
          key.includes('is_tba_') ||
          key.includes('deployed_') ||
          key.includes('balance_') ||
          key.includes('owner_') ||
          key.includes('tba_source_') ||
          key.includes('tba_tokens_')
        )
      );
      
      console.log(`Found ${tbaKeys.length} TBA cache keys:`);
      tbaKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          const parsed = value ? JSON.parse(value) : null;
          console.log(`📋 ${key}:`, parsed);
        } catch (e) {
          console.log(`📋 ${key}: [Parse Error]`, localStorage.getItem(key));
        }
      });
    } catch (error) {
      console.error('TBA cache debug error:', error);
    }
    console.groupEnd();
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

// デバッグ用: グローバルアクセス可能にする
if (typeof window !== 'undefined') {
  (window as any).debugTBACache = () => cacheService.debugTBACache();
  (window as any).clearTBACache = () => cacheService.clearTBACache();
  console.log('🔧 TBA Debug tools available:');
  console.log('  debugTBACache() - Show all TBA cache data');
  console.log('  clearTBACache() - Clear all TBA cache data');
}