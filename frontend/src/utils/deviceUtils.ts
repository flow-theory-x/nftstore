/**
 * デバイス・ブラウザ関連のユーティリティ
 */

export const DeviceUtils = {
  /**
   * モバイルデバイスかどうかを判定
   */
  isMobile(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  },

  /**
   * ストレージ使用量を取得
   */
  async getStorageUsage(): Promise<{ usagePercent: number; usedMB: number; quotaMB: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage || 0) / 1024 / 1024;
        const quotaMB = (estimate.quota || 0) / 1024 / 1024;
        const usagePercent = (usedMB / quotaMB) * 100;
        
        return { usagePercent, usedMB, quotaMB };
      } catch (error) {
        console.warn('Could not estimate storage usage:', error);
        return null;
      }
    }
    return null;
  },

  /**
   * メモリ使用量を取得
   */
  getMemoryUsage(): { usagePercent: number; usedMB: number; limitMB: number } | null {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
      const limitMB = memInfo.jsHeapSizeLimit / 1024 / 1024;
      const usagePercent = (usedMB / limitMB) * 100;
      
      return { usagePercent, usedMB, limitMB };
    }
    return null;
  },

  /**
   * 3D関連キャッシュのみをクリア
   */
  clear3DCache(): void {
    // localStorage から 3D 関連のキーのみクリア
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('three') || 
        key.includes('webgl') || 
        key.includes('model') ||
        key.includes('3d') ||
        key.includes('viewer')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // 3D関連キャッシュをクリア
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('three') || name.includes('model') || name.includes('3d')) {
            caches.delete(name);
          }
        });
      }).catch(() => {
        console.warn('Failed to clear 3D caches');
      });
    }
  }
};