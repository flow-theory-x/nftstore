import React, { useState, useEffect } from 'react';
import { NFTCard } from '../components/NFTCard';
import { ContractService } from '../utils/contract';
import type { NFTToken } from '../types';
import styles from './TokensPage.module.css';

export const TokensPage: React.FC = () => {
  const [tokens, setTokens] = useState<NFTToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);

  const fetchTokensBatch = async (startIndex: number) => {
    try {
      const contractService = new ContractService();
      const { tokens: newTokens, hasMore: moreTokens } = await contractService.getTokensBatch(startIndex, 3);
      
      // 重複チェックを追加
      setTokens(prev => {
        const uniqueNewTokens = newTokens.filter(newToken => 
          !prev.some(existingToken => existingToken.tokenId === newToken.tokenId)
        );
        return [...prev, ...uniqueNewTokens];
      });
      setHasMore(moreTokens);
      
      return newTokens.length;
    } catch (err: any) {
      console.error('Failed to fetch tokens batch:', err);
      throw err;
    }
  };

  useEffect(() => {
    const initializeTokens = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const contractService = new ContractService();
        const supply = await contractService.getTotalSupply();
        setTotalSupply(supply);
        
        if (supply > 0) {
          await fetchTokensBatch(0);
        }
        setInitialized(true);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch tokens');
        console.error('Failed to fetch tokens:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeTokens();
  }, []);

  useEffect(() => {
    if (!initialized || !hasMore || loading || isLoadingMore || tokens.length === 0) return;
    
    // 初回ロード直後の実行を防ぐため、わずかな遅延を追加
    const timer = setTimeout(() => {
      if (!hasMore || loading || isLoadingMore) return;
      
      const loadMoreTokens = async () => {
        setIsLoadingMore(true);
        try {
          await fetchTokensBatch(tokens.length);
        } catch (err: any) {
          setError(err.message || 'Failed to fetch more tokens');
        } finally {
          setIsLoadingMore(false);
        }
      };

      loadMoreTokens();
    }, 100);

    return () => clearTimeout(timer);
  }, [tokens.length, hasMore, loading, isLoadingMore, initialized]);

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>All Tokens</h1>
        <div className={styles.loading}>Loading tokens...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>All Tokens</h1>
        <div className={styles.error}>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>All Tokens</h1>
      
      {totalSupply === 0 ? (
        <div className={styles.empty}>
          <p>No tokens found</p>
        </div>
      ) : (
        <>
          <div className={styles.stats}>
            Loaded: {tokens.length}/{totalSupply} tokens
            {isLoadingMore && (
              <span className={styles.renderingStatus}>
                - Loading more...
              </span>
            )}
          </div>
          
          <div className={styles.grid}>
            {tokens.map((token) => (
              <NFTCard key={token.tokenId} token={token} />
            ))}
          </div>
          
          {hasMore && !isLoadingMore && (
            <div className={styles.loadingMore}>
              Loading next batch...
            </div>
          )}
        </>
      )}
    </div>
  );
};