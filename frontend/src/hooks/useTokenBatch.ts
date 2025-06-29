import { useState, useCallback } from 'react';
import { useNftContract } from './useNftContract';
import type { NFTToken } from '../types';

export interface TokenBatchState {
  nftTokens: NFTToken[];
  sbtTokens: NFTToken[];
  loading: boolean;
  isLoadingMore: boolean;
  currentTokenInfo: string;
  hasMore: boolean;
  error: string | null;
  currentBatchIndex: number;
}

export interface TokenBatchOptions {
  batchSize?: number;
  autoLoadDelay?: number;
}

/**
 * トークンのバッチ取得を管理するカスタムフック
 * @param owner オーナーアドレス
 * @param contractAddress コントラクトアドレス（省略時はデフォルト）
 * @param options バッチ取得のオプション
 */
export const useTokenBatch = (
  owner: string | null,
  contractAddress?: string,
  options: TokenBatchOptions = {}
) => {
  const { batchSize = 10, autoLoadDelay = 100 } = options;
  const contractService = useNftContract(contractAddress);

  const [state, setState] = useState<TokenBatchState>({
    nftTokens: [],
    sbtTokens: [],
    loading: true,
    isLoadingMore: false,
    currentTokenInfo: '',
    hasMore: true,
    error: null,
    currentBatchIndex: 0
  });

  const fetchTokensBatch = useCallback(async (startIndex: number) => {
    if (!owner) return false;

    try {
      // オーナーのトークンIDリストを取得
      const ownerTokenIds = await contractService.getTokensByOwner(owner);
      const endIndex = Math.min(startIndex + batchSize, ownerTokenIds.length);
      
      setState(prev => ({
        ...prev,
        currentTokenInfo: `Loading tokens ${startIndex + 1}-${endIndex} of ${ownerTokenIds.length}...`
      }));
      
      // 1件ずつ取得して即座に表示
      for (let i = startIndex; i < endIndex; i++) {
        try {
          const tokenInfo = await contractService.getTokenInfo(ownerTokenIds[i]);
          
          // 即座にUIに反映
          setState(prev => {
            if (tokenInfo.isSbt) {
              const existsInSbt = prev.sbtTokens.some(existing => existing.tokenId === tokenInfo.tokenId);
              return {
                ...prev,
                sbtTokens: existsInSbt ? prev.sbtTokens : [...prev.sbtTokens, tokenInfo]
              };
            } else {
              const existsInNft = prev.nftTokens.some(existing => existing.tokenId === tokenInfo.tokenId);
              return {
                ...prev,
                nftTokens: existsInNft ? prev.nftTokens : [...prev.nftTokens, tokenInfo]
              };
            }
          });
          
          setState(prev => ({
            ...prev,
            currentTokenInfo: `Loading token ${i + 1} of ${ownerTokenIds.length}...`
          }));
        } catch (error) {
          console.warn(`Failed to get info for token ${ownerTokenIds[i]}:`, error);
        }
      }
      
      const hasMore = endIndex < ownerTokenIds.length;
      setState(prev => ({
        ...prev,
        currentTokenInfo: '',
        hasMore
      }));
      
      return hasMore;
    } catch (err: unknown) {
      console.error("Failed to fetch tokens batch:", err);
      setState(prev => ({
        ...prev,
        currentTokenInfo: '',
        error: err instanceof Error ? err.message : 'Failed to fetch tokens'
      }));
      throw err;
    }
  }, [owner, contractService, batchSize]);

  const loadMore = useCallback(async () => {
    if (state.loading || state.isLoadingMore || !state.hasMore) return;

    setState(prev => ({ ...prev, isLoadingMore: true }));
    
    try {
      const nextIndex = state.currentBatchIndex + batchSize;
      await fetchTokensBatch(nextIndex);
      setState(prev => ({ ...prev, currentBatchIndex: nextIndex }));
    } catch (err) {
      console.error("Failed to load more tokens:", err);
    } finally {
      setState(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [state.loading, state.isLoadingMore, state.hasMore, state.currentBatchIndex, batchSize, fetchTokensBatch]);

  const reset = useCallback(() => {
    setState({
      nftTokens: [],
      sbtTokens: [],
      loading: true,
      isLoadingMore: false,
      currentTokenInfo: '',
      hasMore: true,
      error: null,
      currentBatchIndex: 0
    });
  }, []);

  const startInitialLoad = useCallback(async () => {
    if (!owner) return;

    reset();
    
    try {
      setState(prev => ({ ...prev, loading: false, isLoadingMore: true }));
      await fetchTokensBatch(0);
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to fetch tokens',
        loading: false
      }));
    } finally {
      setState(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [owner, reset, fetchTokensBatch]);

  return {
    ...state,
    loadMore,
    reset,
    startInitialLoad,
    totalTokens: state.nftTokens.length + state.sbtTokens.length
  };
};

/**
 * クリエイターのトークンバッチ取得フック
 */
export const useCreatorTokenBatch = (
  creatorAddress: string | null,
  contractAddress?: string,
  options?: TokenBatchOptions
) => {
  const contractService = useNftContract(contractAddress);
  
  const [state, setState] = useState<TokenBatchState>({
    nftTokens: [],
    sbtTokens: [],
    loading: true,
    isLoadingMore: false,
    currentTokenInfo: '',
    hasMore: true,
    error: null,
    currentBatchIndex: 0
  });

  const fetchCreatorTokensBatch = useCallback(async (startIndex: number) => {
    if (!creatorAddress) return false;

    try {
      // クリエイターのトークンIDリストを取得
      const creatorTokenIds = await contractService.getCreatorTokens(creatorAddress);
      const endIndex = Math.min(startIndex + (options?.batchSize || 10), creatorTokenIds.length);
      
      setState(prev => ({
        ...prev,
        currentTokenInfo: `Loading tokens ${startIndex + 1}-${endIndex} of ${creatorTokenIds.length}...`
      }));
      
      // 1件ずつ取得して即座に表示
      for (let i = startIndex; i < endIndex; i++) {
        try {
          const tokenInfo = await contractService.getTokenInfo(creatorTokenIds[i]);
          
          // 即座にUIに反映
          setState(prev => {
            if (tokenInfo.isSbt) {
              const existsInSbt = prev.sbtTokens.some(existing => existing.tokenId === tokenInfo.tokenId);
              return {
                ...prev,
                sbtTokens: existsInSbt ? prev.sbtTokens : [...prev.sbtTokens, tokenInfo]
              };
            } else {
              const existsInNft = prev.nftTokens.some(existing => existing.tokenId === tokenInfo.tokenId);
              return {
                ...prev,
                nftTokens: existsInNft ? prev.nftTokens : [...prev.nftTokens, tokenInfo]
              };
            }
          });
          
          setState(prev => ({
            ...prev,
            currentTokenInfo: `Loading token ${i + 1} of ${creatorTokenIds.length}...`
          }));
        } catch (error) {
          console.warn(`Failed to get info for token ${creatorTokenIds[i]}:`, error);
        }
      }
      
      const hasMore = endIndex < creatorTokenIds.length;
      setState(prev => ({
        ...prev,
        currentTokenInfo: '',
        hasMore
      }));
      
      return hasMore;
    } catch (err: unknown) {
      console.error("Failed to fetch creator tokens batch:", err);
      setState(prev => ({
        ...prev,
        currentTokenInfo: '',
        error: err instanceof Error ? err.message : 'Failed to fetch creator tokens'
      }));
      throw err;
    }
  }, [creatorAddress, contractService, options?.batchSize]);

  const startInitialLoad = useCallback(async () => {
    if (!creatorAddress) return;

    setState({
      nftTokens: [],
      sbtTokens: [],
      loading: false,
      isLoadingMore: true,
      currentTokenInfo: '',
      hasMore: true,
      error: null,
      currentBatchIndex: 0
    });
    
    try {
      await fetchCreatorTokensBatch(0);
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to fetch creator tokens',
        loading: false
      }));
    } finally {
      setState(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [creatorAddress, fetchCreatorTokensBatch]);

  return {
    ...state,
    startInitialLoad,
    totalTokens: state.nftTokens.length + state.sbtTokens.length
  };
};