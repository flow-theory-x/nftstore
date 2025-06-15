import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import styles from './ThreeDViewer.module.css';

interface SimpleThreeDViewerProps {
  modelUrl: string;
  className?: string;
}

export const SimpleThreeDViewer: React.FC<SimpleThreeDViewerProps> = ({ modelUrl, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    let animationFrameId: number;
    let mixer: THREE.AnimationMixer | null = null;
    const clock = new THREE.Clock();

    // 初期化
    const init = () => {
      // シーン作成
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5f5f5);

      // カメラ作成
      const aspect = container.clientWidth / container.clientHeight;
      camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
      camera.position.set(0, 0, 5);

      // レンダラー作成
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      // コントロール作成
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.screenSpacePanning = false;
      controls.minDistance = 1;
      controls.maxDistance = 100;
      controls.maxPolarAngle = Math.PI;

      // ライティング設定 - シンプルで明るく
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(1, 1, 1).normalize();
      scene.add(directionalLight);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight2.position.set(-1, 0.5, -1).normalize();
      scene.add(directionalLight2);
    };

    // モデル読み込み
    const loadModel = () => {
      const loader = new GLTFLoader();
      
      loader.load(
        modelUrl,
        (gltf) => {
          try {
            const model = gltf.scene;

            // モデルの境界を計算
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            // モデルを中央に配置
            model.position.sub(center);

            // モデルのスケール調整
            const maxSize = Math.max(size.x, size.y, size.z);
            const targetSize = 3;
            if (maxSize > 0) {
              const scale = targetSize / maxSize;
              model.scale.setScalar(scale);
            }

            // シーンに追加
            scene.add(model);

            // カメラ位置調整
            const distance = targetSize * 2;
            camera.position.set(distance, distance * 0.5, distance);
            camera.lookAt(0, 0, 0);
            controls.target.set(0, 0, 0);
            controls.update();

            // アニメーション設定
            if (gltf.animations && gltf.animations.length > 0) {
              mixer = new THREE.AnimationMixer(model);
              gltf.animations.forEach((clip) => {
                const action = mixer!.clipAction(clip);
                action.play();
              });
            }

            setLoading(false);
            console.log('Model loaded successfully');
          } catch (err) {
            console.error('Error processing model:', err);
            setError('Failed to process 3D model');
            setLoading(false);
          }
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Loading progress: ${percent.toFixed(1)}%`);
        },
        (error) => {
          console.error('Error loading model:', error);
          setError('Failed to load 3D model');
          setLoading(false);
        }
      );
    };

    // アニメーションループ
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      
      if (mixer) {
        mixer.update(delta);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    // リサイズハンドラー
    const handleResize = () => {
      if (!container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    // 初期化実行
    init();
    loadModel();
    animate();

    window.addEventListener('resize', handleResize);

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (mixer) {
        mixer.stopAllAction();
      }
      
      if (controls) {
        controls.dispose();
      }
      
      if (renderer) {
        renderer.dispose();
        if (container && renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      
      // メモリリーク防止
      scene?.clear();
    };
  }, [modelUrl]);

  if (error) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      {loading && (
        <div className={styles.loading}>
          <p>Loading 3D model...</p>
        </div>
      )}
      <div ref={containerRef} className={styles.viewer} />
      {!loading && (
        <div className={styles.controls}>
          <p>Drag to rotate • Scroll to zoom • Right-click to pan</p>
        </div>
      )}
    </div>
  );
};