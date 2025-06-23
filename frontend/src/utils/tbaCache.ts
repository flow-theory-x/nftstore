/**
 * TBA関連のキャッシュユーティリティ
 * getCodeとgetBalanceの結果をキャッシュしてRPC負荷を軽減
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class TBACache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 60000; // 1分

  /**
   * キャッシュから値を取得
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * キャッシュに値を設定
   */
  set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * getCode結果のキャッシュキー生成
   */
  getCodeKey(address: string): string {
    return `code:${address.toLowerCase()}`;
  }

  /**
   * getBalance結果のキャッシュキー生成
   */
  getBalanceKey(address: string): string {
    return `balance:${address.toLowerCase()}`;
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 期限切れエントリを削除
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// シングルトンインスタンス
export const tbaCache = new TBACache();

// 定期的なクリーンアップ（5分ごと）
setInterval(() => {
  tbaCache.cleanup();
}, 300000);