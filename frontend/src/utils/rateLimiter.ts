// レート制限コンテキストの型定義（循環依存を避けるため）
type RateLimitCallback = (isLimited: boolean, retryTime?: number, message?: string) => void;
type RetryCallback = () => void;

export class RateLimiter {
  private static instance: RateLimiter;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private minDelay = 100; // 最小100ms間隔
  private rateLimitDelay = 10000; // レート制限時は10秒待機
  private rateLimitCallback: RateLimitCallback | null = null;
  private retryCallback: RetryCallback | null = null;

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  public setRateLimitCallback(callback: RateLimitCallback) {
    this.rateLimitCallback = callback;
  }

  public setRetryCallback(callback: RetryCallback) {
    this.retryCallback = callback;
  }

  private constructor() {}

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRateLimitError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorData = error?.data || '';
    
    const isRateLimit = (
      errorMessage.includes('too many requests') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('call rate limit exhausted') ||
      errorData.includes('rate limit') ||
      error?.code === -32090
    );
    
    // レート制限エラーの詳細をログ出力
    if (isRateLimit) {
      console.group('🚫 RATE LIMIT ERROR DETECTED');
      console.error('Error object:', error);
      console.log('Error message:', errorMessage);
      console.log('Error code:', error?.code);
      console.log('Error data:', error?.data);
      if (error?.data?.trace_id) {
        console.log('Trace ID:', error.data.trace_id);
      }
      // レート制限の詳細情報を抽出
      const retryMatch = errorMessage.match(/retry in (\d+[ms]?\d*[smh]?)/);
      if (retryMatch) {
        console.log('Suggested retry time:', retryMatch[1]);
      }
      console.groupEnd();
    }
    
    return isRateLimit;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        await request();
        // 正常な場合は最小遅延
        await this.delay(this.minDelay);
      } catch (error) {
        if (this.isRateLimitError(error)) {
          console.group('⏱️ RATE LIMIT HANDLER');
          console.warn('🚫 Rate limit detected in request queue processing');
          console.log('⏰ Waiting for', this.rateLimitDelay / 1000, 'seconds before retry');
          console.log('📊 Current queue size:', this.requestQueue.length);
          console.groupEnd();
          
          // レート制限状態をUIに通知
          if (this.rateLimitCallback) {
            const retryTime = Date.now() + this.rateLimitDelay;
            this.rateLimitCallback(true, retryTime, 'Blockchain API rate limit reached. Waiting to retry...');
          }
          
          console.log('⏳ Starting rate limit delay...');
          await this.delay(this.rateLimitDelay);
          console.log('✅ Rate limit delay completed, resuming requests');
          
          // レート制限解除をUIに通知
          if (this.rateLimitCallback) {
            this.rateLimitCallback(false);
          }
        } else {
          // その他のエラーは短い遅延で再開
          await this.delay(this.minDelay);
        }
        throw error;
      }
    }

    this.isProcessing = false;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.requestQueue.push(request);
      this.processQueue();
    });
  }

  // リトライ機能付きの実行
  public async executeWithRetry<T>(
    fn: () => Promise<T>, 
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(fn);
      } catch (error) {
        lastError = error;
        
        if (this.isRateLimitError(error)) {
          console.group(`🔄 RATE LIMIT RETRY ${attempt + 1}/${maxRetries + 1}`);
          console.warn('🚫 Rate limit hit in executeWithRetry');
          console.log('📈 Retry attempt:', attempt + 1, 'of', maxRetries + 1);
          console.log('⏰ Delay before retry:', this.rateLimitDelay / 1000, 'seconds');
          console.groupEnd();
          
          if (attempt < maxRetries) {
            // レート制限状態をUIに通知
            if (this.rateLimitCallback) {
              const retryTime = Date.now() + this.rateLimitDelay;
              this.rateLimitCallback(true, retryTime, `Rate limit reached. Retrying... (${attempt + 1}/${maxRetries + 1})`);
            }
            
            // リトライ回数をUIに通知
            if (this.retryCallback) {
              this.retryCallback();
            }
            
            console.log(`⏳ Starting retry delay for attempt ${attempt + 1}...`);
            await this.delay(this.rateLimitDelay);
            console.log(`✅ Retry delay completed for attempt ${attempt + 1}`);
            
            // レート制限解除をUIに通知
            if (this.rateLimitCallback) {
              this.rateLimitCallback(false);
            }
            continue;
          }
        } else if (attempt < maxRetries) {
          const backoffDelay = retryDelay * Math.pow(2, attempt);
          console.group(`🔄 GENERAL RETRY ${attempt + 1}/${maxRetries + 1}`);
          console.warn('⚠️ Non-rate-limit error, retrying with exponential backoff');
          console.log('📈 Retry attempt:', attempt + 1, 'of', maxRetries + 1);
          console.log('⏰ Backoff delay:', backoffDelay, 'ms');
          console.log('❌ Error:', error?.message || error);
          console.groupEnd();
          
          await this.delay(backoffDelay); // Exponential backoff
          continue;
        }
        
        break;
      }
    }

    throw lastError;
  }
}

export const rateLimiter = RateLimiter.getInstance();