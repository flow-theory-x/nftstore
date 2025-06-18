import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface RateLimitState {
  isRateLimited: boolean;
  retryCount: number;
  nextRetryTime: number | null;
  message: string;
}

interface RateLimitContextType {
  rateLimitState: RateLimitState;
  setRateLimit: (isLimited: boolean, retryTime?: number, message?: string) => void;
  incrementRetry: () => void;
  clearRateLimit: () => void;
}

const RateLimitContext = createContext<RateLimitContextType | undefined>(undefined);

export const useRateLimit = () => {
  const context = useContext(RateLimitContext);
  if (!context) {
    throw new Error('useRateLimit must be used within a RateLimitProvider');
  }
  return context;
};

interface RateLimitProviderProps {
  children: ReactNode;
}

export const RateLimitProvider: React.FC<RateLimitProviderProps> = ({ children }) => {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    isRateLimited: false,
    retryCount: 0,
    nextRetryTime: null,
    message: '',
  });

  const setRateLimit = (isLimited: boolean, retryTime?: number, message?: string) => {
    setRateLimitState(prev => ({
      ...prev,
      isRateLimited: isLimited,
      nextRetryTime: retryTime || null,
      message: message || '',
    }));
  };

  const incrementRetry = () => {
    setRateLimitState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1,
    }));
  };

  const clearRateLimit = () => {
    setRateLimitState({
      isRateLimited: false,
      retryCount: 0,
      nextRetryTime: null,
      message: '',
    });
  };

  return (
    <RateLimitContext.Provider
      value={{
        rateLimitState,
        setRateLimit,
        incrementRetry,
        clearRateLimit,
      }}
    >
      {children}
    </RateLimitContext.Provider>
  );
};