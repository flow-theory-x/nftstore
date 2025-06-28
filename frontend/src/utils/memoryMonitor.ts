/**
 * グローバルメモリ監視システム
 * ブラウザの自動リロード問題を予防
 */

class MemoryMonitor {
  private isMonitoring = false;
  private memoryCheckInterval?: NodeJS.Timeout;
  private warningCallbacks: Array<(usage: number) => void> = [];
  private lastMemoryUsage = 0;

  start() {
    if (this.isMonitoring) return;
    
    console.log('🔍 Starting global memory monitoring...');
    this.isMonitoring = true;
    
    // ブラウザの自動リロード検出・防止
    this.setupAutoReloadPrevention();
    
    // 定期的なメモリチェック
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 5000); // 5秒ごと
    
    // WebGL コンテキスト失効の監視
    this.setupWebGLMonitoring();
  }

  stop() {
    if (!this.isMonitoring) return;
    
    console.log('🛑 Stopping global memory monitoring...');
    this.isMonitoring = false;
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = undefined;
    }
  }

  onMemoryWarning(callback: (usage: number) => void) {
    this.warningCallbacks.push(callback);
  }

  private checkMemoryUsage() {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
      const limitMB = memInfo.jsHeapSizeLimit / 1024 / 1024;
      const usagePercent = (usedMB / limitMB) * 100;
      
      // 急激なメモリ増加を検出
      const memoryIncrease = usedMB - this.lastMemoryUsage;
      if (memoryIncrease > 50) { // 50MB以上の急増
        console.warn(`🚨 Rapid memory increase detected: +${memoryIncrease.toFixed(1)}MB`);
      }
      
      this.lastMemoryUsage = usedMB;
      
      // 警告レベルのチェック
      if (usagePercent > 80) {
        console.error(`🚨 CRITICAL: Memory usage ${usagePercent.toFixed(1)}% - Browser may auto-reload`);
        this.triggerWarningCallbacks(usagePercent);
      } else if (usagePercent > 70) {
        console.warn(`⚠️ HIGH: Memory usage ${usagePercent.toFixed(1)}%`);
        this.triggerWarningCallbacks(usagePercent);
      }
      
      // デバッグ情報
      if (usagePercent > 50) {
        console.log(`📊 Memory: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);
      }
    }
  }

  private setupAutoReloadPrevention() {
    const preventAutoReload = (e: BeforeUnloadEvent) => {
      // ページが表示されている状態での unload は怪しい
      if (document.visibilityState === 'visible') {
        const memoryUsage = this.getCurrentMemoryUsage();
        if (memoryUsage > 70) {
          console.warn('⚠️ Potential browser auto-reload due to memory pressure');
          e.preventDefault();
          e.returnValue = 'High memory usage detected. This may cause the page to reload automatically. Continue?';
          return e.returnValue;
        }
      }
    };
    
    window.addEventListener('beforeunload', preventAutoReload);
    
    // Page Visibility API でタブの状態変化を監視
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 Page became visible - checking memory status');
        this.checkMemoryUsage();
      }
    });
  }

  private setupWebGLMonitoring() {
    // WebGL コンテキスト失効の監視
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null || 
              canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    if (gl) {
      const loseContextExt = gl.getExtension('WEBGL_lose_context');
      
      canvas.addEventListener('webglcontextlost', (e) => {
        console.error('🚨 WebGL context lost - likely due to memory pressure');
        e.preventDefault();
        
        // WebGL コンテキスト失効時は全 3D コンテンツを停止
        this.triggerWarningCallbacks(100); // 最大警告レベル
      });
    }
  }

  private triggerWarningCallbacks(usage: number) {
    this.warningCallbacks.forEach(callback => {
      try {
        callback(usage);
      } catch (error) {
        console.error('Memory warning callback error:', error);
      }
    });
  }

  private getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
      const limitMB = memInfo.jsHeapSizeLimit / 1024 / 1024;
      return (usedMB / limitMB) * 100;
    }
    return 0;
  }

  // 緊急時のメモリクリーンアップ
  emergencyCleanup() {
    console.log('🚨 Emergency memory cleanup initiated');
    
    // 可能な限りのクリーンアップ
    if ('gc' in window) {
      (window as any).gc(); // Chrome開発者モードでのガベージコレクション
    }
    
    // 画像キャッシュをクリア
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    });
    
    // 3D関連のキャッシュをクリア
    this.clear3DCache();
    
    console.log('🧹 Emergency cleanup completed');
  }

  private clear3DCache() {
    // localStorage から 3D 関連を削除
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('three') || 
        key.includes('webgl') || 
        key.includes('model') ||
        key.includes('3d')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

// シングルトンインスタンス
export const memoryMonitor = new MemoryMonitor();

// 自動開始（開発環境のみ）
if (import.meta.env.DEV) {
  memoryMonitor.start();
}