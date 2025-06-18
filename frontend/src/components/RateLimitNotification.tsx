import React, { useEffect, useState } from 'react';
import { useRateLimit } from '../contexts/RateLimitContext';
import styles from './RateLimitNotification.module.css';

export const RateLimitNotification: React.FC = () => {
  const { rateLimitState } = useRateLimit();
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (rateLimitState.isRateLimited && rateLimitState.nextRetryTime) {
      const updateCountdown = () => {
        const now = Date.now();
        const remaining = Math.max(0, rateLimitState.nextRetryTime! - now);
        setCountdown(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          setCountdown(0);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    }
  }, [rateLimitState.isRateLimited, rateLimitState.nextRetryTime]);

  if (!rateLimitState.isRateLimited) {
    return null;
  }

  return (
    <div className={styles.notification}>
      <div className={styles.content}>
        <div className={styles.icon}>⏱️</div>
        <div className={styles.message}>
          <h3>API Rate Limit Reached</h3>
          <p>
            {rateLimitState.message || 'Too many requests to the blockchain. Please wait while we retry...'}
          </p>
          {countdown > 0 && (
            <p className={styles.countdown}>
              Retrying in {countdown} seconds...
            </p>
          )}
          {rateLimitState.retryCount > 0 && (
            <p className={styles.retryInfo}>
              Retry attempt: {rateLimitState.retryCount}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};