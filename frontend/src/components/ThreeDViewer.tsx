import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import styles from './ThreeDViewer.module.css';

interface ThreeDViewerProps {
  modelUrl: string;
  className?: string;
}

export const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ modelUrl, className }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    let animationId: number;

    const init = () => {
      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xffffff);

      // Camera
      camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 1000);
      camera.position.set(0, 0, 10);

      // Renderer
      renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance"
      });
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = false; // パフォーマンス向上のため無効化
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      mount.appendChild(renderer.domElement);

      // Controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.autoRotate = false;
      controls.maxDistance = 50;
      controls.minDistance = 1;

      // ライティング - 明るくバランス良く
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      // メインライト（前方）
      const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
      mainLight.position.set(5, 5, 5);
      scene.add(mainLight);

      // フィルライト（左上）
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
      fillLight.position.set(-5, 3, 2);
      scene.add(fillLight);

      // リムライト（背面）
      const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
      rimLight.position.set(0, 2, -5);
      scene.add(rimLight);

      // Load model
      loadModel();
    };

    const centerAndScaleModel = (model: THREE.Object3D) => {
      // モデル全体の境界ボックスを計算
      const box = new THREE.Box3();
      box.setFromObject(model);
      
      if (box.isEmpty()) {
        console.warn('Model has no geometry');
        return;
      }
      
      // 境界ボックスの中心とサイズを取得
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      
      console.log('Original center:', center.clone());
      console.log('Original size:', size.clone());
      
      // モデルを原点中心に移動
      model.position.copy(center).multiplyScalar(-1);
      
      // 適切なスケールを計算（画面に収まるように）
      const maxDimension = Math.max(size.x, size.y, size.z);
      const targetSize = 6; // 目標サイズを1.5倍に増加（4 * 1.5 = 6）
      const scale = maxDimension > 0 ? targetSize / maxDimension : 1;
      model.scale.setScalar(scale);
      
      // カメラ位置を調整
      const distance = targetSize * 2.5;
      camera.position.set(distance, distance * 0.6, distance);
      camera.lookAt(0, 0, 0);
      
      // OrbitControlsのターゲットを設定
      controls.target.set(0, 0, 0);
      controls.update();
      
      console.log('Final model position:', model.position.clone());
      console.log('Final model scale:', model.scale.clone());
      console.log('Camera position:', camera.position.clone());
    };

    const loadModel = () => {
      console.log('Loading 3D model:', modelUrl);
      
      const loader = new GLTFLoader();
      
      // CORSエラー回避のためのクロスオリジン設定
      loader.setCrossOrigin('anonymous');
      
      loader.load(
        modelUrl,
        (gltf) => {
          console.log('GLTF loaded successfully');
          const model = gltf.scene;
          
          // モデルが空でないことを確認
          if (!model || model.children.length === 0) {
            setError('3D model is empty or invalid');
            setLoading(false);
            return;
          }
          
          // マテリアルの最適化
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.material) {
                // マテリアルの明度を上げる
                if (child.material instanceof THREE.MeshStandardMaterial) {
                  child.material.roughness = 0.5;
                  child.material.metalness = 0.1;
                }
                child.material.needsUpdate = true;
              }
              child.castShadow = false;
              child.receiveShadow = false;
            }
          });
          
          // シーンに追加
          scene.add(model);
          
          // モデルのセンタリングとスケーリング
          centerAndScaleModel(model);
          
          setLoading(false);
          
          // アニメーションがある場合は再生
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
              const action = mixer.clipAction(clip);
              action.play();
            });
            
            // アニメーションループ用のクロック
            const clock = new THREE.Clock();
            const animateModel = () => {
              if (mixer) {
                mixer.update(clock.getDelta());
              }
            };
            
            // アニメーション関数を保存（クリーンアップ用）
            (model as any).animateModel = animateModel;
          }
        },
        (progress) => {
          console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
          console.error('Error loading 3D model:', error);
          setError(`Failed to load 3D model`);
          setLoading(false);
        }
      );
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // コントロールの更新
      controls.update();
      
      // モデルのアニメーション更新
      scene.traverse((child) => {
        if (child.userData && typeof child.userData.animateModel === 'function') {
          child.userData.animateModel();
        }
      });
      
      // レンダリング
      renderer.render(scene, camera);
    };

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    init();
    animate();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
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
      <div ref={mountRef} className={styles.viewer} />
      <div className={styles.controls}>
        <p>Click and drag to rotate • Scroll to zoom • Right-click and drag to pan</p>
      </div>
    </div>
  );
};