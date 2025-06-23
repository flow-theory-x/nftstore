import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { NFTCard } from "../components/NFTCard";
import { Spinner } from "../components/Spinner";
import { NftContractService } from "../utils/nftContract";
import { MemberService } from "../utils/memberService";
import { CONTRACT_ADDRESS } from "../constants";
import type { NFTToken, MemberInfo } from "../types";
import styles from "./TokensPage.module.css";

export const CreatorPage: React.FC = () => {
  const { creatorAddress } = useParams<{ creatorAddress?: string }>();
  const [tokens, setTokens] = useState<NFTToken[]>([]);
  const [nftTokens, setNftTokens] = useState<NFTToken[]>([]);
  const [sbtTokens, setSbtTokens] = useState<NFTToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCreatorTokens, setTotalCreatorTokens] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [creatorName, setCreatorName] = useState<string>("");
  const [creatorMemberInfo, setCreatorMemberInfo] = useState<MemberInfo | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("Loading creator tokens...");
  const [currentTokenInfo, setCurrentTokenInfo] = useState<string>("");
  const [contractInfoLoaded, setContractInfoLoaded] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const handleRefresh = () => {
    // キャッシュをクリアして再取得
    setTokens([]);
    setNftTokens([]);
    setSbtTokens([]);
    setInitialized(false);
    setHasMore(true);
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

  const fetchCreatorTokensBatch = async (startIndex: number) => {
    try {
      const contractService = new NftContractService(CONTRACT_ADDRESS);
      
      // Track how many tokens were added in this batch
      let tokensAddedCount = 0;

      const { hasMore: moreTokens } =
        await contractService.getCreatorTokensBatchWithProgress(
          creatorAddress!, 
          startIndex,
          10, // batchSize
          setCurrentTokenInfo,
          (token) => {
            // Add each token immediately as it's ready and sort by NFT/SBT
            setTokens((prev) => {
              // Check for duplicates
              if (prev.some(existingToken => existingToken.tokenId === token.tokenId)) {
                return prev;
              }
              tokensAddedCount++;
              return [...prev, token];
            });
            
            // Sort into NFT or SBT arrays
            if (token.isSbt) {
              setSbtTokens((prev) => {
                if (prev.some(existingToken => existingToken.tokenId === token.tokenId)) {
                  return prev;
                }
                return [...prev, token];
              });
            } else {
              setNftTokens((prev) => {
                if (prev.some(existingToken => existingToken.tokenId === token.tokenId)) {
                  return prev;
                }
                return [...prev, token];
              });
            }
          },
          startIndex === 0 && forceRefresh > 0 // Force refresh on first batch only
        );

      setCurrentTokenInfo("");
      setHasMore(moreTokens);
      return { tokensAddedCount, hasMore: moreTokens };
    } catch (err: any) {
      console.error("Failed to fetch creator tokens batch:", err);
      setCurrentTokenInfo("");
      throw err;
    }
  };

  useEffect(() => {
    // Reset state when creator address changes
    setTokens([]);
    setNftTokens([]);
    setSbtTokens([]);
    setLoading(true);
    setError(null);
    setIsLoadingMore(false);
    setTotalCreatorTokens(null);
    setInitialized(false);
    setContractInfoLoaded(false);
    setHasMore(true);

    // Load creator info immediately
    const loadCreatorInfo = async () => {
      try {
        setLoadingMessage("Loading creator information...");
        const contractService = new NftContractService(CONTRACT_ADDRESS);
        const memberService = new MemberService();

        // Get creator name from contract if set
        try {
          const name = await contractService.getCreatorName(creatorAddress!);
          setCreatorName(name || "");
        } catch (err) {
          console.warn("Failed to fetch creator name:", err);
          setCreatorName("");
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

        // Get total number of tokens created by this creator
        setLoadingMessage("Getting creator's token count...");
        const creatorTokenIds = await contractService.getCreatorTokens(creatorAddress!);
        setTotalCreatorTokens(creatorTokenIds.length);
        setContractInfoLoaded(true);
        setLoading(false);

      } catch (err: any) {
        setError(err.message || "Failed to fetch creator info");
        console.error("Failed to fetch creator info:", err);
        setLoading(false);
      }
    };

    if (creatorAddress) {
      loadCreatorInfo();
    }
  }, [creatorAddress, forceRefresh]);

  // Start loading tokens after creator info is loaded
  useEffect(() => {
    if (!contractInfoLoaded || totalCreatorTokens === null || totalCreatorTokens === 0 || initialized) return;

    const startLoadingTokens = async () => {
      try {
        setIsLoadingMore(true);
        setLoadingMessage("Loading first batch of tokens...");

        const contractService = new NftContractService(CONTRACT_ADDRESS);
        const { hasMore: moreTokens } =
          await contractService.getCreatorTokensBatchWithProgress(
            creatorAddress!, 
            0,
            10, // batchSize
            setCurrentTokenInfo,
            (token) => {
              // Add each token immediately as it's ready and sort by NFT/SBT
              setTokens((prev) => {
                // Check for duplicates
                if (prev.some(existingToken => existingToken.tokenId === token.tokenId)) {
                  return prev;
                }
                return [...prev, token];
              });
              
              // Sort into NFT or SBT arrays
              if (token.isSbt) {
                setSbtTokens((prev) => {
                  if (prev.some(existingToken => existingToken.tokenId === token.tokenId)) {
                    return prev;
                  }
                  return [...prev, token];
                });
              } else {
                setNftTokens((prev) => {
                  if (prev.some(existingToken => existingToken.tokenId === token.tokenId)) {
                    return prev;
                  }
                  return [...prev, token];
                });
              }
            },
            forceRefresh > 0 // Force refresh if requested
          );

        setHasMore(moreTokens);
        setInitialized(true);
      } catch (err: any) {
        setError(err.message || "Failed to fetch creator tokens");
        console.error("Failed to fetch creator tokens:", err);
      } finally {
        setIsLoadingMore(false);
        setLoadingMessage("");
      }
    };

    startLoadingTokens();
  }, [contractInfoLoaded, totalCreatorTokens, creatorAddress, initialized]);

  // Auto-load more tokens
  useEffect(() => {
    if (!initialized || totalCreatorTokens === null || loading || isLoadingMore || !hasMore) return;
    if (tokens.length >= totalCreatorTokens) return; // All tokens loaded

    const timer = setTimeout(() => {
      if (loading || isLoadingMore || tokens.length >= totalCreatorTokens! || !hasMore) return;

      console.log("🔄 Auto-loading more creator tokens:", {
        currentTokens: tokens.length,
        totalTokens: totalCreatorTokens,
        loading,
        isLoadingMore,
      });

      const loadMoreTokens = async () => {
        setIsLoadingMore(true);
        setCurrentTokenInfo("Preparing to load more tokens...");
        try {
          const result = await fetchCreatorTokensBatch(tokens.length);
          console.log("✅ Auto-loaded creator tokens:", result.tokensAddedCount);
        } catch (err: any) {
          console.error("❌ Auto-load failed:", err);
          setError(err.message || "Failed to fetch more tokens");
        } finally {
          setIsLoadingMore(false);
          setCurrentTokenInfo("");
        }
      };

      loadMoreTokens();
    }, 100);

    return () => clearTimeout(timer);
  }, [tokens.length, totalCreatorTokens, loading, isLoadingMore, initialized, hasMore]);

  const formatCreatorAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getCreatorDisplayName = () => {
    // 優先順位: Nick > Name > Username > contract creator name
    return creatorMemberInfo?.Nick || creatorMemberInfo?.nickname ||
           creatorMemberInfo?.Name || creatorMemberInfo?.name ||
           creatorMemberInfo?.Username || creatorMemberInfo?.username ||
           creatorName || "Creator";
  };

  const getPageTitle = () => {
    const displayName = getCreatorDisplayName();
    
    if (displayName !== "Creator") {
      return `${displayName} (${formatCreatorAddress(creatorAddress!)})`;
    }
    return formatCreatorAddress(creatorAddress!);
  };

  if (loading && !contractInfoLoaded) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          {creatorAddress ? getPageTitle() : "Creator"}
        </h1>
        <Spinner size="large" text={loadingMessage} />
      </div>
    );
  }

  if (error && !contractInfoLoaded) {
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

      {error && contractInfoLoaded && (
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

      {totalCreatorTokens === null ? (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "24px" }}>
          <Spinner size="medium" />
          <span>{loadingMessage || "Loading creator information..."}</span>
        </div>
      ) : totalCreatorTokens === 0 ? (
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
              Loaded: {tokens.length}/{totalCreatorTokens} tokens
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {(isLoadingMore || loadingMessage) && (
                <>
                  <Spinner size="small" />
                  <span style={{ fontSize: "0.9em", color: "#666" }}>
                    {currentTokenInfo || loadingMessage || "Loading tokens..."}
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

          {tokens.length === 0 && !isLoadingMore && !loadingMessage && (
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

          {hasMore && !isLoadingMore && tokens.length > 0 && (
            <Spinner size="medium" text="Loading next batch..." />
          )}
        </>
      )}
    </div>
  );
};