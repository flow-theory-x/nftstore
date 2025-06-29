import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { NFTCard } from "../components/NFTCard";
import { Spinner } from "../components/Spinner";
import { NftContractService } from "../utils/nftContract";
import { copyToClipboard } from "../utils/clipboardUtils";
import { CONTRACT_ADDRESS } from "../constants";
import type { NFTToken } from "../types";
import styles from "./TokensPage.module.css";

export const TokensPage: React.FC = () => {
  const { contractAddress } = useParams<{ contractAddress?: string }>();
  const effectiveContractAddress = contractAddress || CONTRACT_ADDRESS;
  
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
  
  // コントラクト情報
  const [contractName, setContractName] = useState<string>("All Tokens");
  const [totalSupply, setTotalSupply] = useState<number>(0);
  
  // リフレッシュトリガー
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // 現在のバッチインデックス
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [allTokenIds, setAllTokenIds] = useState<string[]>([]);

  const handleRefresh = () => {
    setNftTokens([]);
    setSbtTokens([]);
    setHasMore(true);
    setCurrentBatchIndex(0);
    setAllTokenIds([]);
    setForceRefresh(prev => prev + 1);
  };


  const fetchTokensBatch = useCallback(async (startIndex: number) => {
    console.log(`📦 fetchTokensBatch called with startIndex: ${startIndex}, allTokenIds.length: ${allTokenIds.length}`);
    
    if (allTokenIds.length === 0) {
      console.log("❌ No token IDs available, skipping batch fetch");
      return false;
    }
    
    try {
      const contractService = new NftContractService(effectiveContractAddress);
      const batchSize = 10;
      const endIndex = Math.min(startIndex + batchSize, allTokenIds.length);
      
      console.log(`📋 Batch details: startIndex=${startIndex}, endIndex=${endIndex}, batchSize=${batchSize}`);
      
      const tokens: NFTToken[] = [];
      
      for (let i = startIndex; i < endIndex; i++) {
        try {
          setCurrentTokenInfo(`Loading token ${i + 1}/${allTokenIds.length}...`);
          console.log(`🔍 Fetching token info for tokenId: ${allTokenIds[i]}`);
          const tokenInfo = await contractService.getTokenInfo(allTokenIds[i]);
          console.log(`✅ Token info fetched:`, tokenInfo);
          tokens.push(tokenInfo);
        } catch (error) {
          console.warn(`Failed to get info for token ${allTokenIds[i]}:`, error);
        }
      }

      console.log(`🎯 Batch fetched ${tokens.length} tokens successfully`);

      // トークンをNFT/SBTに直接振り分け
      tokens.forEach((token) => {
        if (token.isSbt) {
          setSbtTokens(prev => {
            if (prev.some(existing => existing.tokenId === token.tokenId)) return prev;
            return [...prev, token];
          });
        } else {
          setNftTokens(prev => {
            if (prev.some(existing => existing.tokenId === token.tokenId)) return prev;
            return [...prev, token];
          });
        }
      });

      setCurrentTokenInfo("");
      const hasMoreTokens = endIndex < allTokenIds.length;
      setHasMore(hasMoreTokens);
      console.log(`🔄 hasMore: ${hasMoreTokens}`);
      return hasMoreTokens;
    } catch (err: unknown) {
      console.error("Failed to fetch tokens batch:", err);
      setCurrentTokenInfo("");
      throw err;
    }
  }, [effectiveContractAddress, allTokenIds]);

  useEffect(() => {
    // Reset state when contract address changes
    setNftTokens([]);
    setSbtTokens([]);
    setLoading(true);
    setError(null);
    setIsLoadingMore(false);
    setHasMore(true);
    setCurrentBatchIndex(0);
    setCurrentTokenInfo("");
    setAllTokenIds([]);

    // Load contract info and get all token IDs
    const loadContractInfo = async () => {
      try {
        setCurrentTokenInfo("Connecting to contract...");
        const contractService = new NftContractService(effectiveContractAddress);

        // Load contract name
        try {
          setCurrentTokenInfo("Fetching contract name...");
          const name = await contractService.getName();
          setContractName(name || "All Tokens");
        } catch (err) {
          console.warn("Failed to fetch contract name:", err);
        }

        // Load total supply
        setCurrentTokenInfo("Getting total supply...");
        const supply = await contractService.getTotalSupply();
        setTotalSupply(supply);
        console.log("📊 Total supply:", supply);

        if (supply === 0) {
          console.log("❌ No tokens exist (totalSupply = 0)");
          setLoading(false);
          setHasMore(false);
          return;
        }

        // Get all token IDs
        setCurrentTokenInfo("Getting all token IDs...");
        const tokenIds = await contractService.getAllTokenIds();
        console.log("🆔 Token IDs found:", tokenIds.length, tokenIds);
        setAllTokenIds(tokenIds);

        setLoading(false);
        
        // Start fetching first batch of tokens
        if (tokenIds.length > 0) {
          console.log("🚀 Starting to fetch first batch of tokens...");
          setIsLoadingMore(true);
          
          // Directly call the token batch logic here instead of using fetchTokensBatch
          try {
            const contractService = new NftContractService(effectiveContractAddress);
            const batchSize = 10;
            const endIndex = Math.min(0 + batchSize, tokenIds.length);
            
            console.log(`📋 Batch details: startIndex=0, endIndex=${endIndex}, batchSize=${batchSize}`);
            
            const tokens: NFTToken[] = [];
            
            for (let i = 0; i < endIndex; i++) {
              try {
                setCurrentTokenInfo(`Loading token ${i + 1}/${tokenIds.length}...`);
                console.log(`🔍 Fetching token info for tokenId: ${tokenIds[i]}`);
                const tokenInfo = await contractService.getTokenInfo(tokenIds[i]);
                console.log(`✅ Token info fetched:`, tokenInfo);
                tokens.push(tokenInfo);
              } catch (error) {
                console.warn(`Failed to get info for token ${tokenIds[i]}:`, error);
              }
            }

            console.log(`🎯 Initial batch fetched ${tokens.length} tokens successfully`);

            // トークンをNFT/SBTに直接振り分け
            tokens.forEach((token) => {
              if (token.isSbt) {
                setSbtTokens(prev => {
                  if (prev.some(existing => existing.tokenId === token.tokenId)) return prev;
                  return [...prev, token];
                });
              } else {
                setNftTokens(prev => {
                  if (prev.some(existing => existing.tokenId === token.tokenId)) return prev;
                  return [...prev, token];
                });
              }
            });

            setCurrentTokenInfo("");
            const hasMoreTokens = endIndex < tokenIds.length;
            setHasMore(hasMoreTokens);
            console.log(`🔄 hasMore: ${hasMoreTokens}`);
            
          } catch (error) {
            console.error("Failed to fetch initial tokens:", error);
            setError("Failed to fetch tokens");
          }
          
          setIsLoadingMore(false);
        } else {
          console.log("❌ No token IDs found, setting hasMore to false");
          setHasMore(false);
        }

      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch contract info");
        console.error("Failed to fetch contract info:", err);
        setLoading(false);
        setIsLoadingMore(false);
      }
    };

    loadContractInfo();
  }, [effectiveContractAddress, forceRefresh]);

  // Auto-load more tokens
  useEffect(() => {
    if (loading || isLoadingMore || !hasMore || allTokenIds.length === 0) return;

    const timer = setTimeout(() => {
      if (loading || isLoadingMore || !hasMore) return;

      console.log("🔄 Auto-loading more tokens:", {
        currentBatchIndex,
        nftTokens: nftTokens.length,
        sbtTokens: sbtTokens.length,
        hasMore,
        totalTokenIds: allTokenIds.length
      });

      const loadMoreTokens = async () => {
        setIsLoadingMore(true);
        try {
          const currentLoadedCount = nftTokens.length + sbtTokens.length;
          const nextIndex = currentLoadedCount;
          console.log(`🔄 Loading more tokens from index ${nextIndex}`);
          
          await fetchTokensBatch(nextIndex);
          setCurrentBatchIndex(nextIndex);
          console.log("✅ Auto-loaded more tokens");
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
  }, [nftTokens.length, sbtTokens.length, loading, isLoadingMore, hasMore, currentBatchIndex, allTokenIds.length]);

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>{contractName}</h1>
        <Spinner size="large" text={currentTokenInfo || "Loading contract information..."} />
      </div>
    );
  }

  if (error && nftTokens.length === 0 && sbtTokens.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>{contractName}</h1>
        <div className={styles.error}>
          <p>{error}</p>
          <div className={styles.errorActions}>
            <button
              onClick={() => copyToClipboard(error)}
              className={styles.copyErrorButton}
              title="Copy error message"
            >
              Copy
            </button>
            <button
              onClick={() => window.location.reload()}
              className={styles.retryButton}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{contractName}</h1>

      {error && (nftTokens.length > 0 || sbtTokens.length > 0) && (
        <div className={styles.error}>
          <p>{error}</p>
          <div className={styles.errorActions}>
            <button
              onClick={() => copyToClipboard(error)}
              className={styles.copyErrorButton}
              title="Copy error message"
            >
              Copy
            </button>
            <button
              onClick={() => window.location.reload()}
              className={styles.retryButton}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {totalSupply === 0 ? (
        <div className={styles.empty}>
          <p>No tokens found</p>
        </div>
      ) : nftTokens.length === 0 && sbtTokens.length === 0 && !isLoadingMore && !hasMore ? (
        <div className={styles.empty}>
          <p>No tokens available</p>
        </div>
      ) : (
        <>
          <div
            className={styles.stats}
            style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}
          >
            <span>
              Loaded: {nftTokens.length + sbtTokens.length}/{totalSupply} tokens (NFT: {nftTokens.length}, SBT: {sbtTokens.length})
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
                NFT ({nftTokens.length})
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
                SBT ({sbtTokens.length})
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