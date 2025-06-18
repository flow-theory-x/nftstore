// リクエストの重複排除と結果共有のためのユーティリティ
export class RequestDeduplicator {
  private static instance: RequestDeduplicator;
  private pendingRequests = new Map<string, Promise<any>>();
  private completedRequests = new Map<string, { result: any; timestamp: number }>();
  private maxCacheAge = 30000; // 30秒間結果をキャッシュ

  public static getInstance(): RequestDeduplicator {
    if (!RequestDeduplicator.instance) {
      RequestDeduplicator.instance = new RequestDeduplicator();
    }
    return RequestDeduplicator.instance;
  }

  private constructor() {
    // 定期的に古いキャッシュをクリーンアップ
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // 1分ごと
  }

  private cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, cached] of this.completedRequests.entries()) {
      if (now - cached.timestamp > this.maxCacheAge) {
        this.completedRequests.delete(key);
      }
    }
  }

  private generateKey(identifier: string, params?: any): string {
    if (params) {
      return `${identifier}:${JSON.stringify(params)}`;
    }
    return identifier;
  }

  // 重複リクエストを排除して実行
  public async execute<T>(
    identifier: string,
    fn: () => Promise<T>,
    params?: any
  ): Promise<T> {
    const key = this.generateKey(identifier, params);

    // 既に完了した結果があるかチェック
    const cached = this.completedRequests.get(key);
    if (cached && Date.now() - cached.timestamp < this.maxCacheAge) {
      console.log(`🔄 RequestDeduplicator HIT: ${key}`);
      return cached.result;
    }

    // 進行中のリクエストがあるかチェック
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`⏳ RequestDeduplicator WAITING: ${key}`);
      return await pending;
    }

    // 新しいリクエストを開始
    console.log(`🚀 RequestDeduplicator NEW: ${key}`);
    const promise = fn().then(
      (result) => {
        // 成功時は結果をキャッシュ
        this.completedRequests.set(key, {
          result,
          timestamp: Date.now()
        });
        this.pendingRequests.delete(key);
        return result;
      },
      (error) => {
        // エラー時は進行中リクエストを削除（キャッシュはしない）
        this.pendingRequests.delete(key);
        throw error;
      }
    );

    this.pendingRequests.set(key, promise);
    return await promise;
  }

  // 特定のキーのキャッシュを無効化
  public invalidate(identifier: string, params?: any) {
    const key = this.generateKey(identifier, params);
    this.completedRequests.delete(key);
    this.pendingRequests.delete(key);
  }

  // 全てのキャッシュをクリア
  public clearAll() {
    this.completedRequests.clear();
    this.pendingRequests.clear();
  }

  // キャッシュ統計情報を取得
  public getStats() {
    return {
      pendingCount: this.pendingRequests.size,
      cachedCount: this.completedRequests.size,
      cacheKeys: Array.from(this.completedRequests.keys())
    };
  }
}

export const requestDeduplicator = RequestDeduplicator.getInstance();