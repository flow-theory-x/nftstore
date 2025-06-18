import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { NFTCard } from "../components/NFTCard";
import { Spinner } from "../components/Spinner";
import { NftContractService } from "../utils/nftContract";
import type { NFTToken } from "../types";
import styles from "./TokensPage.module.css";

export const TokensPage: React.FC = () => {
  const { contractAddress } = useParams<{ contractAddress?: string }>();
  const [tokens, setTokens] = useState<NFTToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalSupply, setTotalSupply] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [contractName, setContractName] = useState<string>("All Tokens");
  const [loadingMessage, setLoadingMessage] =
    useState<string>("Loading tokens...");
  const [currentTokenInfo, setCurrentTokenInfo] = useState<string>("");
  const [contractInfoLoaded, setContractInfoLoaded] = useState(false);

  const handleRefresh = () => {
    // ページをリロードして最新データを取得
    window.location.reload();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const fetchTokensBatch = async (startIndex: number) => {
    try {
      const contractService = new NftContractService(contractAddress);

      setCurrentTokenInfo("Loading batch of tokens...");

      const { tokens: newTokens, hasMore: moreTokens } =
        await contractService.getTokensBatch(startIndex, 3);

      // 重複チェックを追加
      setTokens((prev) => {
        const uniqueNewTokens = newTokens.filter(
          (newToken) =>
            !prev.some(
              (existingToken) => existingToken.tokenId === newToken.tokenId
            )
        );
        return [...prev, ...uniqueNewTokens];
      });
      setHasMore(moreTokens);

      setCurrentTokenInfo("");
      return newTokens.length;
    } catch (err: any) {
      console.error("Failed to fetch tokens batch:", err);
      setCurrentTokenInfo("");
      throw err;
    }
  };

  useEffect(() => {
    // contractAddressが変更されたときにstateをリセット
    setTokens([]);
    setLoading(true);
    setError(null);
    setIsLoadingMore(false);
    setHasMore(true);
    setTotalSupply(null);
    setInitialized(false);
    setContractInfoLoaded(false);

    // First, load contract info immediately
    const loadContractInfo = async () => {
      try {
        setLoadingMessage("Connecting to contract...");
        const contractService = new NftContractService(contractAddress);

        // Load contract name
        try {
          setLoadingMessage("Fetching contract name...");
          const name = await contractService.getName();
          setContractName(name || "TOKEN NAME");
        } catch (err) {
          console.warn("Failed to fetch contract name:", err);
        }

        // Load total supply
        setLoadingMessage("Getting total supply...");
        const supply = await contractService.getTotalSupply();
        setTotalSupply(supply);
        setContractInfoLoaded(true);
        setLoading(false);

      } catch (err: any) {
        setError(err.message || "Failed to fetch contract info");
        console.error("Failed to fetch contract info:", err);
        setLoading(false);
      }
    };

    loadContractInfo();
  }, [contractAddress]);

  // Start loading tokens after contract info is loaded
  useEffect(() => {
    if (!contractInfoLoaded || totalSupply === null || totalSupply === 0 || initialized) return;

    const startLoadingTokens = async () => {
      try {
        setIsLoadingMore(true);
        setLoadingMessage("Loading first batch of tokens...");

        const contractService = new NftContractService(contractAddress);
        const { tokens: newTokens, hasMore: moreTokens } =
          await contractService.getTokensBatch(0, 3);

        setTokens(newTokens);
        setHasMore(moreTokens);
        setInitialized(true);
      } catch (err: any) {
        setError(err.message || "Failed to fetch tokens");
        console.error("Failed to fetch tokens:", err);
      } finally {
        setIsLoadingMore(false);
        setLoadingMessage("");
      }
    };

    startLoadingTokens();
  }, [contractInfoLoaded, totalSupply, contractAddress, initialized]);

  useEffect(() => {
    if (!initialized || !hasMore || loading || isLoadingMore) return;

    // 初回ロード直後の実行を防ぐため、わずかな遅延を追加
    const timer = setTimeout(() => {
      if (!hasMore || loading || isLoadingMore) return;

      console.log("🔄 Auto-loading more tokens:", {
        currentTokens: tokens.length,
        hasMore,
        loading,
        isLoadingMore,
      });

      const loadMoreTokens = async () => {
        setIsLoadingMore(true);
        setCurrentTokenInfo("Preparing to load more tokens...");
        try {
          const newTokenCount = await fetchTokensBatch(tokens.length);
          console.log("✅ Auto-loaded tokens:", newTokenCount);
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
  }, [tokens.length, hasMore, loading, isLoadingMore, initialized]);

  if (loading && !contractInfoLoaded) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>{contractName}</h1>
        <Spinner size="large" text={loadingMessage} />
      </div>
    );
  }

  if (error && !contractInfoLoaded) {
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

      {totalSupply === null ? (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "24px" }}>
          <Spinner size="medium" />
          <span>{loadingMessage || "Loading contract information..."}</span>
        </div>
      ) : totalSupply === 0 ? (
        <div className={styles.empty}>
          <p>No tokens found</p>
        </div>
      ) : (
        <>
          <div
            className={styles.stats}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span>
              Loaded: {tokens.length}/{totalSupply} tokens
            </span>
            {(isLoadingMore || loadingMessage) && (
              <>
                <Spinner size="small" />
                <span style={{ fontSize: "0.9em", color: "#666" }}>
                  {currentTokenInfo || loadingMessage || "Loading tokens..."}
                </span>
              </>
            )}
          </div>

          <div className={styles.grid}>
            {tokens.map((token) => (
              <NFTCard
                key={token.tokenId}
                token={token}
                onBurn={handleRefresh}
                onTransfer={handleRefresh}
              />
            ))}
          </div>

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
