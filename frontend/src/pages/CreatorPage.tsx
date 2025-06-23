import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { NFTCard } from "../components/NFTCard";
import { Spinner } from "../components/Spinner";
import { NftContractService } from "../utils/nftContract";
import { MemberService } from "../utils/memberService";
import { withCACasher } from "../utils/caCasherClient";
import { useCreatorPageWalletChange } from "../hooks/useWalletAddressChange";
import { CONTRACT_ADDRESS } from "../constants";
import type { NFTToken, MemberInfo } from "../types";
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
  
  // クリエイター情報
  const [creatorMemberInfo, setCreatorMemberInfo] = useState<MemberInfo | null>(null);
  const [creatorName, setCreatorName] = useState<string>("");
  
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
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

    // Load creator info and start fetching tokens
    const loadCreatorInfo = async () => {
      try {
        const memberService = new MemberService();

        // Get creator name from contract
        try {
          const contractCreatorName = await withCACasher(
            CONTRACT_ADDRESS,
            'getCreatorName',
            [creatorAddress!],
            async () => {
              const contractService = new NftContractService(CONTRACT_ADDRESS);
              return await contractService.getCreatorName(creatorAddress!);
            }
          );
          if (contractCreatorName && contractCreatorName.trim()) {
            setCreatorName(contractCreatorName);
            console.log("📝 Creator name from contract:", contractCreatorName);
          }
        } catch (err) {
          console.warn("Failed to fetch creator name from contract:", err);
        }

        // Get member info from Discord API
        try {
          const memberInfo = await memberService.getMemberInfo(creatorAddress!);
          if (memberInfo) {
            setCreatorMemberInfo(memberInfo);
            console.log("📝 Creator member info:", {
              Nick: memberInfo.Nick || memberInfo.nickname,
              Name: memberInfo.Name || memberInfo.name,
              Username: memberInfo.Username || memberInfo.username,
              DiscordId: memberInfo.DiscordId || memberInfo.discord_id
            });
          }
        } catch (err) {
          console.warn("Failed to fetch member info:", err);
        }

        setLoading(false);
        
        // Start fetching first batch of tokens
        setIsLoadingMore(true);
        await fetchCreatorTokensBatch(0);
        setIsLoadingMore(false);

      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch creator info");
        console.error("Failed to fetch creator info:", err);
        setLoading(false);
        setIsLoadingMore(false);
      }
    };

    loadCreatorInfo();
  }, [creatorAddress, forceRefresh]);


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

  const formatCreatorAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getCreatorDisplayName = () => {
    // 優先順位: getCreatorName > Nick > Name > Username
    const displayName = creatorName ||
           creatorMemberInfo?.Nick || creatorMemberInfo?.nickname ||
           creatorMemberInfo?.Name || creatorMemberInfo?.name ||
           creatorMemberInfo?.Username || creatorMemberInfo?.username ||
           "Creator";
    
    console.log("🏷️ Creator display name calculation:", {
      creatorName,
      memberInfo: creatorMemberInfo ? {
        Nick: creatorMemberInfo.Nick,
        Name: creatorMemberInfo.Name,
        Username: creatorMemberInfo.Username
      } : null,
      finalDisplayName: displayName
    });
    
    return displayName;
  };

  const getPageTitle = () => {
    const displayName = getCreatorDisplayName();
    
    if (displayName !== "Creator") {
      return `${displayName} (${formatCreatorAddress(creatorAddress!)})`;
    }
    return formatCreatorAddress(creatorAddress!);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          {creatorAddress ? getPageTitle() : "Creator"}
        </h1>
        <Spinner size="large" text="Loading creator information..." />
      </div>
    );
  }

  if (error && nftTokens.length === 0 && sbtTokens.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          {creatorAddress ? getPageTitle() : "Creator"}
        </h1>
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
                {getCreatorDisplayName()} NFT ({nftTokens.length})
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
                {getCreatorDisplayName()} SBT ({sbtTokens.length})
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