import React from "react";
import styles from "./ModelViewer.module.css";

interface ModelViewerProps {
  modelUrl: string;
  alt?: string;
  className?: string;
}

export const ModelViewer: React.FC<ModelViewerProps> = ({
  modelUrl,
  alt = "3D Model",
  className,
}) => {
  const viewerUrl = `https://goodsun.github.io/modelviewer/?src=${encodeURIComponent(
    modelUrl
  )}`;

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <iframe
        src={viewerUrl}
        title={alt}
        className={styles.viewer}
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
};
