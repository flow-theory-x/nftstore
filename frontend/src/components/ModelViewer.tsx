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
  const viewerUrl = `${MODEL_VIEWER_BASE_URL}/?src=${encodeURIComponent(
    modelUrl
  )}`;

  const handleIframeError = () => {
    if (onError) {
      onError();
    }
  };

  return (
    <div className={`${styles.container} ${className || ""}`}>
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
