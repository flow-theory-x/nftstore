import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { NFTCard } from "../components/NFTCard";
import { Spinner } from "../components/Spinner";
import { ErrorDisplay } from "../components/ErrorDisplay";
import { NftContractService } from "../utils/nftContract";
import { useCreatorPageWalletChange } from "../hooks/useWalletAddressChange";
import { useAddressInfo } from "../hooks/useAddressInfo";
import { AddressDisplayUtils } from "../utils/addressDisplayUtils";
import { copyToClipboard } from "../utils/clipboardUtils";
import { CONTRACT_ADDRESS } from "../constants";
import { LOADING_MESSAGES } from "../constants/messages";
import type { NFTToken } from "../types";
import styles from "./TokensPage.module.css";

export const CreatorPage: React.FC = () => {
  const { creatorAddress } = useParams<{ creatorAddress?: string }>();
  
  // ウォレットアドレス切り替え検知
  useCreatorPageWalletChange();
  
  // 表示用のトークン配列（NFTとSBTに分離）
  const [nftTokens, setNftTokens] = useState<NFTToken[]>([]);
  const [sbtTokens, setSbtTokens] = useState<NFTToken[]>([]);
  
  // ローディング状態
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentTokenInfo, setCurrentTokenInfo] = useState<string>("");
  const [hasMore, setHasMore] = useState(true);
  
  // エラー状態
  const [error, setError] = useState<string | null>(null);
  
  
  // リフレッシュトリガー
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // 現在のバッチインデックス
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);

  const handleRefresh = () => {
    setNftTokens([]);
    setSbtTokens([]);
    setHasMore(true);
    setCurrentBatchIndex(0);
    setForceRefresh(prev => prev + 1);
  };


  const fetchCreatorTokensBatch = useCallback(async (startIndex: number) => {
    try {
      const contractService = new NftContractService(CONTRACT_ADDRESS);

      // まずクリエイターのトークンIDリストを取得
      const creatorTokenIds = await contractService.getCreatorTokens(creatorAddress!);
      const endIndex = Math.min(startIndex + 10, creatorTokenIds.length);
      
      setCurrentTokenInfo(`Loading tokens ${startIndex + 1}-${endIndex} of ${creatorTokenIds.length}...`);
      
      // 1件ずつ取得して即座に表示
      for (let i = startIndex; i < endIndex; i++) {
        try {
          const tokenInfo = await contractService.getTokenInfo(creatorTokenIds[i]);
          
          // 即座にUIに反映
          if (tokenInfo.isSbt) {
            setSbtTokens(prev => {
              if (prev.some(existing => existing.tokenId === tokenInfo.tokenId)) return prev;
              return [...prev, tokenInfo];
            });
          } else {
            setNftTokens(prev => {
              if (prev.some(existing => existing.tokenId === tokenInfo.tokenId)) return prev;
              return [...prev, tokenInfo];
            });
          }
          
          setCurrentTokenInfo(`Loading token ${i + 1} of ${creatorTokenIds.length}...`);
        } catch (error) {
          console.warn(`Failed to get info for token ${creatorTokenIds[i]}:`, error);
        }
      }
      
      setCurrentTokenInfo("");
      const hasMore = endIndex < creatorTokenIds.length;
      setHasMore(hasMore);
      return hasMore;
    } catch (err: unknown) {
      console.error("Failed to fetch creator tokens batch:", err);
      setCurrentTokenInfo("");
      throw err;
    }
  }, [creatorAddress, forceRefresh]);

  useEffect(() => {
    if (!creatorAddress) return;

    // Reset state when creator address changes
    setNftTokens([]);
    setSbtTokens([]);
    setLoading(true);
    setError(null);
    setIsLoadingMore(false);
    setHasMore(true);
    setCurrentBatchIndex(0);
    setCurrentTokenInfo("");

    // Start fetching tokens
    const loadCreatorTokens = async () => {
      try {
        setLoading(false);
        
        // Start fetching first batch of tokens
        setIsLoadingMore(true);
        await fetchCreatorTokensBatch(0);
        setIsLoadingMore(false);

      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch creator tokens");
        console.error("Failed to fetch creator tokens:", err);
        setLoading(false);
        setIsLoadingMore(false);
      }
    };

    loadCreatorTokens();
  }, [creatorAddress, forceRefresh, fetchCreatorTokensBatch]);

  const addressInfo = useAddressInfo(creatorAddress);


  // Auto-load more tokens
  useEffect(() => {
    if (loading || isLoadingMore || !hasMore) return;

    const timer = setTimeout(() => {
      if (loading || isLoadingMore || !hasMore) return;

      console.log("🔄 Auto-loading more creator tokens:", {
        currentBatchIndex,
        nftTokens: nftTokens.length,
        sbtTokens: sbtTokens.length,
        hasMore
      });

      const loadMoreTokens = async () => {
        setIsLoadingMore(true);
        try {
          const nextIndex = currentBatchIndex + 10;
          setCurrentBatchIndex(nextIndex);
          await fetchCreatorTokensBatch(nextIndex);
          console.log("✅ Auto-loaded more creator tokens");
        } catch (err: unknown) {
          console.error("❌ Auto-load failed:", err);
          setError(err instanceof Error ? err.message : "Failed to fetch more tokens");
        } finally {
          setIsLoadingMore(false);
        }
      };

      loadMoreTokens();
    }, 100);

    return () => clearTimeout(timer);
  }, [nftTokens.length, sbtTokens.length, loading, isLoadingMore, hasMore, currentBatchIndex]);

  const getPageTitle = () => {
    const displayName = addressInfo.displayName;
    
    if (displayName !== AddressDisplayUtils.formatAddress(creatorAddress || '')) {
      return `${displayName} (${AddressDisplayUtils.formatAddress(creatorAddress!)})`;
    }
    return AddressDisplayUtils.formatAddress(creatorAddress!);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          {creatorAddress ? getPageTitle() : "Creator"}
        </h1>
        <Spinner size="large" text={LOADING_MESSAGES.CREATOR_INFO} />
      </div>
    );
  }

  if (error && nftTokens.length === 0 && sbtTokens.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          {creatorAddress ? getPageTitle() : "Creator"}
        </h1>
        <ErrorDisplay 
          error={error}
          title="Failed to Load Creator"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!creatorAddress) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Creator</h1>
        <div className={styles.error}>
          <p>Creator address not provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{getPageTitle()}</h1>

      {error && (nftTokens.length > 0 || sbtTokens.length > 0) && (
        <ErrorDisplay 
          error={error}
          title="Failed to Load Creator"
          onRetry={() => window.location.reload()}
        />
      )}

      {nftTokens.length === 0 && sbtTokens.length === 0 && !isLoadingMore && !hasMore ? (
        <div className={styles.empty}>
          <p>This creator has not minted any tokens yet</p>
        </div>
      ) : (
        <>
          <div
            className={styles.stats}
            style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}
          >
            <span>
              Loaded: {nftTokens.length + sbtTokens.length} tokens (NFT: {nftTokens.length}, SBT: {sbtTokens.length})
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isLoadingMore && (
                <>
                  <Spinner size="small" />
                  <span style={{ fontSize: "0.9em", color: "#666" }}>
                    {currentTokenInfo || "Loading tokens..."}
                  </span>
                </>
              )}
              <button
                onClick={handleRefresh}
                disabled={isLoadingMore}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.8em",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  backgroundColor: "#f5f5f5",
                  cursor: isLoadingMore ? "not-allowed" : "pointer",
                  opacity: isLoadingMore ? 0.5 : 1
                }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* NFT Section */}
          {nftTokens.length > 0 && (
            <div style={{ marginBottom: "40px" }}>
              <h2 style={{ 
                fontSize: "1.5em", 
                marginBottom: "16px", 
                borderBottom: "2px solid #ddd", 
                paddingBottom: "8px" 
              }}>
                {addressInfo.displayName} NFT ({nftTokens.length})
              </h2>
              <div className={styles.grid}>
                {nftTokens.map((token) => (
                  <NFTCard
                    key={token.tokenId}
                    token={token}
                    onBurn={handleRefresh}
                    onTransfer={handleRefresh}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SBT Section */}
          {sbtTokens.length > 0 && (
            <div style={{ marginBottom: "40px" }}>
              <h2 style={{ 
                fontSize: "1.5em", 
                marginBottom: "16px", 
                borderBottom: "2px solid #ddd", 
                paddingBottom: "8px" 
              }}>
                {addressInfo.displayName} SBT ({sbtTokens.length})
              </h2>
              <div className={styles.grid}>
                {sbtTokens.map((token) => (
                  <NFTCard
                    key={token.tokenId}
                    token={token}
                    onBurn={handleRefresh}
                    onTransfer={handleRefresh}
                  />
                ))}
              </div>
            </div>
          )}

          {nftTokens.length === 0 && sbtTokens.length === 0 && !isLoadingMore && hasMore && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '40px',
              gap: '12px'
            }}>
              <Spinner size="medium" />
              <span>Preparing to load tokens...</span>
            </div>
          )}

          {hasMore && !isLoadingMore && (nftTokens.length > 0 || sbtTokens.length > 0) && (
            <Spinner size="medium" text="Loading next batch..." />
          )}
        </>
      )}
    </div>
  );
};