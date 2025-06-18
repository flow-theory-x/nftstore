import React from 'react';
import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'medium', 
  text,
  className 
}) => {
  return (
    <div className={`${styles.spinnerContainer} ${className || ''}`}>
      <div className={`${styles.spinner} ${styles[size]}`}>
        <div className={styles.spinnerInner}></div>
      </div>
      {text && <div className={styles.spinnerText}>{text}</div>}
    </div>
  );
};