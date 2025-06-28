import React from "react";
import styles from "./ModelViewer.module.css";
import { MODEL_VIEWER_BASE_URL } from "../constants";

interface ModelViewerProps {
  modelUrl: string;
  alt?: string;
  className?: string;
  onError?: () => void;
}

export const ModelViewer: React.FC<ModelViewerProps> = ({
  modelUrl,
  alt = "3D Model",
  className,
  onError,
}) => {
  const [hasError, setHasError] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [storageWarning, setStorageWarning] = React.useState(false);
  const [memoryWarning, setMemoryWarning] = React.useState(false);

  // モバイル判定とリソースチェック
  React.useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    };
    
    const checkStorageUsage = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          const usedMB = (estimate.usage || 0) / 1024 / 1024;
          const quotaMB = (estimate.quota || 0) / 1024 / 1024;
          const usagePercent = (usedMB / quotaMB) * 100;
          
          console.log(`Storage usage: ${usedMB.toFixed(1)}MB / ${quotaMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);
          
          // 80%以上使用している場合は警告
          if (usagePercent > 80) {
            setStorageWarning(true);
          }
        } catch (error) {
          console.log('Could not estimate storage usage:', error);
        }
      }
    };

    const checkMemoryUsage = () => {
      // メモリ情報をチェック（利用可能な場合）
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
        const limitMB = memInfo.jsHeapSizeLimit / 1024 / 1024;
        const usagePercent = (usedMB / limitMB) * 100;
        
        console.log(`Memory usage: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);
        
        // 70%以上使用している場合は警告
        if (usagePercent > 70) {
          setMemoryWarning(true);
        }
      }
    };

    // ブラウザの自動リロードを検出・防止
    const preventAutoReload = (e: BeforeUnloadEvent) => {
      // メモリ不足時の自動リロードかどうかを判定
      if (document.visibilityState === 'visible' && !e.returnValue) {
        console.warn('⚠️ Potential browser auto-reload detected due to memory issues');
        // ユーザーが意図しないリロードの場合は確認
        e.preventDefault();
        e.returnValue = 'This page is consuming significant memory. Are you sure you want to reload?';
        return e.returnValue;
      }
    };
    
    setIsMobile(checkMobile());
    checkStorageUsage();
    checkMemoryUsage();
    
    // メモリ監視とリロード防止
    window.addEventListener('beforeunload', preventAutoReload);
    
    // 定期的なメモリチェック（10秒ごと）
    const memoryCheckInterval = setInterval(checkMemoryUsage, 10000);
    
    return () => {
      window.removeEventListener('beforeunload', preventAutoReload);
      clearInterval(memoryCheckInterval);
    };
  }, []);

  const viewerUrl = `${MODEL_VIEWER_BASE_URL}/?src=${encodeURIComponent(
    modelUrl
  )}`;

  const handleIframeError = () => {
    console.warn('ModelViewer iframe error detected');
    setHasError(true);
    if (onError) {
      onError();
    }
  };

  // 3Dビューワー関連のストレージのみをクリアする関数
  const clearViewerCacheAndReload = () => {
    try {
      // 3Dビューワー関連のキーのみクリア（重要な設定は保持）
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
      
      // キャッシュから3D関連のものだけクリア
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            if (name.includes('three') || name.includes('model') || name.includes('3d')) {
              caches.delete(name);
            }
          });
        }).catch(() => {
          // キャッシュクリアに失敗してもページは再読み込み
        });
      }
      
      // 少し待ってからページを再読み込み
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to clear viewer cache:', error);
      // エラーが発生してもページは再読み込み
      window.location.reload();
    }
  };

  // モバイルでエラーが発生している場合はストレージクリアオプションを表示
  if (hasError && isMobile) {
    return (
      <div className={`${styles.container} ${className || ""}`}>
        <div className={styles.externalViewerPrompt}>
          <div className={styles.viewerIcon}>⚠️</div>
          <h3 className={styles.viewerTitle}>3D Model Loading Issue</h3>
          <p className={styles.viewerDescription}>
            The 3D model couldn't load properly. This often happens when browser storage is full on mobile devices.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
            <button
              onClick={clearViewerCacheAndReload}
              className={styles.viewerButton}
              style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
            >
              Clear 3D Cache & Reload
            </button>
            
            <a
              href={viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.viewerButton}
            >
              Open in New Tab
            </a>
          </div>
          
          <div className={styles.viewerHint}>
            <p><strong>Clear 3D Cache & Reload:</strong> Clears only 3D-related cache and reloads the page (recommended)</p>
            <p><strong>Open in New Tab:</strong> Opens the 3D viewer in a separate tab</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ""}`}>
      {/* リソース警告（モバイルのみ） */}
      {(storageWarning || memoryWarning) && isMobile && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          background: memoryWarning ? 'rgba(220, 53, 69, 0.95)' : 'rgba(255, 193, 7, 0.95)',
          color: memoryWarning ? '#721c24' : '#856404',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          {memoryWarning ? 
            '🚨 High memory usage detected. Browser may auto-reload to recover.' :
            '⚠️ Browser storage is nearly full. If the 3D model fails to load, try clearing storage.'
          }
        </div>
      )}
      
      <iframe
        src={viewerUrl}
        title={alt}
        className={styles.viewer}
        allowFullScreen
        loading="lazy"
        onError={handleIframeError}
        onLoad={(e) => {
          // Check if iframe content loaded successfully
          try {
            const iframe = e.currentTarget as HTMLIFrameElement;
            // If iframe loads but shows error page, trigger error
            setTimeout(() => {
              try {
                if (iframe.contentDocument?.title?.includes('Error') || 
                    iframe.contentDocument?.body?.textContent?.includes('error')) {
                  handleIframeError();
                }
              } catch {
                // Cross-origin restrictions prevent access, assume success
              }
            }, 2000);
          } catch {
            // Ignore cross-origin errors
          }
        }}
      />
    </div>
  );
};
