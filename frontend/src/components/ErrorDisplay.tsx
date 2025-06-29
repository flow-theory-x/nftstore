import React from "react";
import { copyToClipboard } from "../utils/clipboardUtils";
import styles from "./ErrorDisplay.module.css";

export interface ErrorDisplayProps {
  error: string | Error | null;
  title?: string;
  showCopyButton?: boolean;
  showRetryButton?: boolean;
  onRetry?: () => void;
  retryButtonText?: string;
  className?: string;
  variant?: "default" | "warning" | "critical" | "info";
  size?: "small" | "medium" | "large";
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title = "Error",
  showCopyButton = true,
  showRetryButton = true,
  onRetry,
  retryButtonText = "Retry",
  className = "",
  variant = "default",
  size = "medium"
}) => {
  if (!error) return null;

  const errorMessage = error instanceof Error ? error.message : String(error);

  const handleCopyError = () => {
    const errorDetails = error instanceof Error
      ? `Error: ${error.message}\nStack: ${error.stack || 'No stack trace'}`
      : `Error: ${errorMessage}`;
    
    copyToClipboard(errorDetails, {
      showAlert: true,
      alertMessage: "Error details copied!"
    });
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className={`${styles.errorContainer} ${styles[`errorContainer--${variant}`]} ${styles[`errorContainer--${size}`]} ${className}`}>
      <div className={styles.errorIcon}>
        {variant === "warning" && "⚠️"}
        {variant === "critical" && "🚨"}
        {variant === "info" && "ℹ️"}
        {variant === "default" && "❌"}
      </div>
      
      <div className={styles.errorContent}>
        <h3 className={styles.errorTitle}>{title}</h3>
        <p className={styles.errorMessage}>{errorMessage}</p>
        
        {(showCopyButton || showRetryButton) && (
          <div className={styles.errorActions}>
            {showCopyButton && (
              <button
                onClick={handleCopyError}
                className={`${styles.errorButton} ${styles.copyButton}`}
                title="Copy error details"
                type="button"
              >
                📋 Copy Details
              </button>
            )}
            
            {showRetryButton && (
              <button
                onClick={handleRetry}
                className={`${styles.errorButton} ${styles.retryButton}`}
                type="button"
              >
                🔄 {retryButtonText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 特定用途向けのコンポーネント
export const NetworkError: React.FC<Omit<ErrorDisplayProps, 'variant' | 'title'>> = (props) => (
  <ErrorDisplay
    {...props}
    variant="warning"
    title="Network Error"
    retryButtonText="Retry Connection"
  />
);

export const ContractError: React.FC<Omit<ErrorDisplayProps, 'variant' | 'title'>> = (props) => (
  <ErrorDisplay
    {...props}
    variant="critical"
    title="Contract Error"
    retryButtonText="Retry Operation"
  />
);

export const LoadingError: React.FC<Omit<ErrorDisplayProps, 'variant' | 'title'>> = (props) => (
  <ErrorDisplay
    {...props}
    variant="default"
    title="Loading Failed"
    retryButtonText="Reload"
  />
);

export const ValidationError: React.FC<Omit<ErrorDisplayProps, 'variant' | 'title' | 'showRetryButton'>> = (props) => (
  <ErrorDisplay
    {...props}
    variant="warning"
    title="Validation Error"
    showRetryButton={false}
  />
);