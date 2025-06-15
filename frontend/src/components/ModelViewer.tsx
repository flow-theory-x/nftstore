import React, { useEffect, useRef, useState } from 'react';
import '@google/model-viewer/dist/model-viewer.min.js';
import styles from './ModelViewer.module.css';

// model-viewer JSX型定義
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

interface ModelViewerProps {
  modelUrl: string;
  alt?: string;
  autoRotate?: boolean;
  className?: string;
  initialExposure?: number;
  initialShadowIntensity?: number;
  initialBackgroundColor?: 'black' | 'white';
}

export const ModelViewer: React.FC<ModelViewerProps> = ({ 
  modelUrl, 
  alt = "3D Model",
  autoRotate = false,
  className,
  initialExposure = 0.7,
  initialShadowIntensity = 0.7,
  initialBackgroundColor = 'black'
}) => {
  const viewerRef = useRef<HTMLElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [exposure, setExposure] = useState(initialExposure);
  const [shadowIntensity, setShadowIntensity] = useState(initialShadowIntensity);
  const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);
  const [showControls, setShowControls] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleLoad = () => {
      console.log('Model loaded successfully');
      setIsLoading(false);
      
      // モデル読み込み後に背景色を再設定
      const viewer = viewerRef.current as any;
      if (viewer) {
        const bgColor = backgroundColor === 'black' ? '#000000' : '#ffffff';
        viewer.style.backgroundColor = bgColor;
        viewer.style.setProperty('--poster-color', bgColor);
      }
    };

    const handleError = (event: any) => {
      console.error('Model loading error:', event.detail);
      setIsLoading(false);
      setHasError(true);
      
      // エラーメッセージを設定
      let errorMsg = 'Failed to load 3D model';
      if (event.detail) {
        if (event.detail.type === 'loadfailure') {
          errorMsg = 'Model file is corrupted or incompatible';
        } else if (event.detail.sourceError) {
          const sourceError = event.detail.sourceError;
          if (sourceError.message && sourceError.message.includes('Invalid typed array length')) {
            errorMsg = 'Model file is too large for browser memory';
          } else if (sourceError.message && sourceError.message.includes('texture')) {
            errorMsg = 'Failed to load model textures';
          }
        }
      }
      setErrorMessage(errorMsg);
    };

    const handleProgress = (event: any) => {
      const progressValue = event.detail.totalProgress;
      console.log(`Loading progress: ${(progressValue * 100).toFixed(1)}%`);
      setProgress(progressValue);
      
      if (progressValue >= 1) {
        // プログレスが100%になったら少し待ってから非表示
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    };

    // モデルの読み込み開始時
    setIsLoading(true);
    setProgress(0);
    setHasError(false);
    setErrorMessage('');

    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);
    viewer.addEventListener('progress', handleProgress);

    return () => {
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
      viewer.removeEventListener('progress', handleProgress);
    };
  }, [modelUrl]);

  // ライト設定と背景色の更新
  useEffect(() => {
    const viewer = viewerRef.current as any;
    if (viewer) {
      viewer.exposure = exposure;
      viewer.shadowIntensity = shadowIntensity;
      
      // 背景色の設定
      const bgColor = backgroundColor === 'black' ? '#000000' : '#ffffff';
      viewer.style.setProperty('--poster-color', bgColor);
      viewer.style.backgroundColor = bgColor;
      
      // 環境マップをクリア
      viewer.environmentImage = null;
      
      // shadowboxを透明にして背景色を確実に表示
      const shadowRoot = viewer.shadowRoot;
      if (shadowRoot) {
        const canvas = shadowRoot.querySelector('canvas');
        if (canvas) {
          canvas.style.backgroundColor = bgColor;
        }
      }
    }
  }, [exposure, shadowIntensity, backgroundColor]);

  // エラー発生時の表示
  if (hasError) {
    return (
      <div 
        className={`${styles.container} ${className || ''}`}
        style={{ backgroundColor: backgroundColor === 'black' ? '#000000' : '#ffffff' }}
      >
        <div className={styles.errorDisplay}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorText}>
            <p className={styles.errorTitle}>3D Model Error</p>
            <p className={styles.errorMessage}>{errorMessage}</p>
            <a 
              href={modelUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.downloadLink}
            >
              Download Original File
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${styles.container} ${className || ''}`}
      style={{ backgroundColor: backgroundColor === 'black' ? '#000000' : '#ffffff' }}
    >
      {/* @ts-ignore */}
      <model-viewer
        ref={viewerRef}
        src={modelUrl}
        alt={alt}
        camera-controls={true}
        auto-rotate={autoRotate}
        loading="eager"
        reveal="auto"
        exposure={exposure.toString()}
        shadow-intensity={shadowIntensity.toString()}
        shadow-softness="0.3"
        style={{
          '--poster-color': backgroundColor === 'black' ? '#000000' : '#ffffff',
          backgroundColor: backgroundColor === 'black' ? '#000000' : '#ffffff'
        } as React.CSSProperties}
        camera-orbit="0deg 75deg 105%"
        field-of-view="30deg"
        min-camera-orbit="auto auto auto"
        max-camera-orbit="auto auto auto"
        min-field-of-view="10deg"
        max-field-of-view="45deg"
        autoplay={true}
        animation-crossfade-duration="300ms"
        className={styles.viewer}
      >
        {/* Google Model Viewerのデフォルトプログレスバーを無効化 */}
        <div slot="progress-bar"></div>
        
        {/* カスタムプログレスバー */}
        {isLoading && (
          <div className={styles.customProgressBar}>
            <div className={styles.progressText}>Loading 3D Model...</div>
            <div className={styles.progressBarTrack}>
              <div 
                className={styles.progressBarFill}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className={styles.progressPercent}>{Math.round(progress * 100)}%</div>
          </div>
        )}
        
        <button 
          slot="ar-button" 
          className={styles.arButton}
          style={{ display: 'none' }}
        >
          View in AR
        </button>

        {/* ライトコントロールボタン */}
        <button 
          className={styles.lightControlButton}
          onClick={() => setShowControls(!showControls)}
          title="Light Controls"
        >
          💡
        </button>

        {/* ライトコントロールパネル */}
        {showControls && (
          <div className={styles.lightControls}>
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>
                Brightness: {Math.round(exposure * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={exposure}
                onChange={(e) => setExposure(parseFloat(e.target.value))}
                className={styles.slider}
              />
            </div>
            
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>
                Shadow: {Math.round(shadowIntensity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.1"
                value={shadowIntensity}
                onChange={(e) => setShadowIntensity(parseFloat(e.target.value))}
                className={styles.slider}
              />
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>
                Background
              </label>
              <div className={styles.backgroundToggle}>
                <button
                  onClick={() => setBackgroundColor('black')}
                  className={`${styles.bgButton} ${styles.bgBlack} ${backgroundColor === 'black' ? styles.active : ''}`}
                  title="Black background"
                >
                  ⚫
                </button>
                <button
                  onClick={() => setBackgroundColor('white')}
                  className={`${styles.bgButton} ${styles.bgWhite} ${backgroundColor === 'white' ? styles.active : ''}`}
                  title="White background"
                >
                  ⚪
                </button>
              </div>
            </div>
            
            <div className={styles.presetButtons}>
              <button 
                onClick={() => { setExposure(0.5); setShadowIntensity(0.3); }}
                className={styles.presetButton}
              >
                Dim
              </button>
              <button 
                onClick={() => { setExposure(0.7); setShadowIntensity(0.7); }}
                className={styles.presetButton}
              >
                Normal
              </button>
              <button 
                onClick={() => { setExposure(1.5); setShadowIntensity(1.2); }}
                className={styles.presetButton}
              >
                Bright
              </button>
            </div>
          </div>
        )}

        {!isLoading && !showControls && (
          <div className={styles.controlsHint}>
            <p>Drag to rotate • Scroll to zoom • Right-click to pan</p>
          </div>
        )}
      {/* @ts-ignore */}
      </model-viewer>
    </div>
  );
};