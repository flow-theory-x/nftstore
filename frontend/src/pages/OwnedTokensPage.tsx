import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { NFTCard } from "../components/NFTCard";
import { Spinner } from "../components/Spinner";
import { NftContractService } from "../utils/nftContract";
import type { NFTToken } from "../types";
import { useWallet } from "../hooks/useWallet";
import { TBA_TARGET_NFT_CA_ADDRESSES, TBA_TARGET_SBT_CA_ADDRESSES } from "../constants";
import { memberService } from "../utils/memberService";
import type { MemberInfo } from "../types";
import { MemberInfoCard } from "../components/MemberInfoCard";
import styles from "./OwnedTokensPage.module.css";

export const OwnedTokensPage: React.FC = () => {
  const { contractAddress, address } = useParams<{
    contractAddress?: string;
    address: string;
  }>();
  const { walletState } = useWallet();
  const [contractsData, setContractsData] = useState<
    Array<{
      contractAddress: string;
      contractName: string;
      tokens: NFTToken[];
      loading: boolean;
      error: string | null;
    }>
  >([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState<
    Record<string, string>
  >({});
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);

  const handleRefresh = () => {
    // ページをリロードして最新データを取得
    window.location.reload();
  };

  const isOwnAddress =
    walletState.address?.toLowerCase() === address?.toLowerCase();

  useEffect(() => {
    const fetchAllContractsData = async () => {
      if (!address) {
        setGlobalLoading(false);
        return;
      }

      try {
        setGlobalLoading(true);

        // If specific contract is requested, only fetch that one
        const contractsToFetch = contractAddress
          ? [contractAddress]
          : [...TBA_TARGET_NFT_CA_ADDRESSES, ...TBA_TARGET_SBT_CA_ADDRESSES];

        const contractPromises = contractsToFetch.map(async (contractAddr) => {
          try {
            const contractService = new NftContractService(contractAddr);

            // 進捗メッセージを更新
            setLoadingMessages((prev) => ({
              ...prev,
              [contractAddr]: "Connecting to contract...",
            }));

            // コントラクト名を取得
            setLoadingMessages((prev) => ({
              ...prev,
              [contractAddr]: "Getting contract name...",
            }));
            const name = await contractService.getName();

            // 所有トークンを取得
            const progressHandler = (message: string, tokenId?: string) => {
              setLoadingMessages((prev) => ({
                ...prev,
                [contractAddr]: tokenId
                  ? `Processing token #${tokenId}: ${message}`
                  : message,
              }));
            };
            const ownedTokens =
              await contractService.getTokensByOwnerWithProgress(
                address,
                progressHandler
              );

            // 完了
            setLoadingMessages((prev) => {
              const newMessages = { ...prev };
              delete newMessages[contractAddr];
              return newMessages;
            });

            return {
              contractAddress: contractAddr,
              contractName:
                name ||
                `Contract ${contractAddr.slice(0, 6)}...${contractAddr.slice(
                  -4
                )}`,
              tokens: ownedTokens,
              loading: false,
              error: null,
            };
          } catch (err: any) {
            console.error(
              `Failed to fetch data for contract ${contractAddr}:`,
              err
            );

            // エラー時もメッセージをクリア
            setLoadingMessages((prev) => {
              const newMessages = { ...prev };
              delete newMessages[contractAddr];
              return newMessages;
            });

            return {
              contractAddress: contractAddr,
              contractName: `Contract ${contractAddr.slice(
                0,
                6
              )}...${contractAddr.slice(-4)}`,
              tokens: [],
              loading: false,
              error: err.message || "Failed to fetch data",
            };
          }
        });

        const results = await Promise.all(contractPromises);
        setContractsData(results);
      } catch (err: any) {
        console.error("Failed to fetch contracts data:", err);
      } finally {
        setGlobalLoading(false);
      }
    };

    fetchAllContractsData();
  }, [contractAddress, address]);

  // メンバー情報を取得
  useEffect(() => {
    const fetchMemberInfo = async () => {
      if (!address) {
        return;
      }

      try {
        setMemberLoading(true);
        console.log(`🔍 Fetching member info for: ${address}`);
        const info = await memberService.getMemberInfo(address);
        setMemberInfo(info);
        console.log(`📋 Member info result:`, info);
      } catch (error) {
        console.error('Failed to fetch member info:', error);
        setMemberInfo(null);
      } finally {
        setMemberLoading(false);
      }
    };

    fetchMemberInfo();
  }, [address]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Add toast notification for copy success
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const totalTokens = contractsData.reduce(
    (total, contract) => total + contract.tokens.length,
    0
  );
  const hasAnyTokens = totalTokens > 0;

  if (globalLoading) {
    const activeMessages = Object.entries(loadingMessages);
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          {isOwnAddress
            ? "My Tokens"
            : `Tokens owned by ${formatAddress(address || "")}`}
        </h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <Spinner size="large" text="Loading NFTs and SBTs from all contracts..." />
          {activeMessages.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                alignItems: "center",
              }}
            >
              {activeMessages.map(([contractAddr, message]) => (
                <div
                  key={contractAddr}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Spinner size="small" />
                  <span style={{ fontSize: "0.9em", color: "#666" }}>
                    {formatAddress(contractAddr)}: {message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isOwnAddress
            ? "My Tokens"
            : `Tokens owned by ${formatAddress(address || "")}`}
        </h1>

        <div className={styles.addressInfo}>
          <span className={styles.addressLabel}>Address:</span>
          <span className={styles.addressValue}>{address}</span>
        </div>

        <div className={styles.stats}>
          <span className={styles.count}>
            {totalTokens} NFT/SBT{totalTokens !== 1 ? "s" : ""} found across{" "}
            {contractsData.length} contract
            {contractsData.length !== 1 ? "s" : ""}
          </span>
          <button onClick={handleRefresh} className={styles.refreshButton}>
            Refresh
          </button>
        </div>
      </div>

      {/* メンバー情報表示 */}
      <MemberInfoCard
        memberInfo={memberInfo}
        loading={memberLoading}
        address={address || ""}
      />

      {!hasAnyTokens ? (
        <div className={styles.empty}>
          <p>
            {isOwnAddress
              ? "You don't own any NFTs or SBTs yet"
              : "This address doesn't own any NFTs or SBTs"}
          </p>
          {isOwnAddress && (
            <Link to="/mint" className={styles.mintLink}>
              Mint your first NFT
            </Link>
          )}
        </div>
      ) : (
        <div className={styles.contractSections}>
          {contractsData
            .filter(
              (contractData) =>
                contractData.tokens.length > 0 || contractData.error
            )
            .map((contractData) => (
              <div
                key={contractData.contractAddress}
                className={styles.contractSection}
              >
                <div className={styles.contractHeader}>
                  <h2 className={styles.contractTitle}>
                    <Link
                      to={`/tokens/${contractData.contractAddress}`}
                      className={styles.contractTitleLink}
                    >
                      {contractData.contractName}
                    </Link>
                  </h2>
                  <div className={styles.contractAddressContainer}>
                    <span className={styles.contractAddress}>
                      {formatAddress(contractData.contractAddress)}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(contractData.contractAddress)
                      }
                      className={styles.copyButton}
                      title="Copy contract address"
                    >
                      📋
                    </button>
                  </div>
                  {contractData.tokens.length > 0 && (
                    <span className={styles.tokenCount}>
                      {contractData.tokens.length} token
                      {contractData.tokens.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {contractData.error ? (
                  <div className={styles.contractError}>
                    <p>Error loading tokens: {contractData.error}</p>
                    <button
                      onClick={() => copyToClipboard(contractData.error)}
                      className={styles.copyErrorButton}
                      title="Copy error message"
                    >
                      Copy
                    </button>
                  </div>
                ) : (
                  <div className={styles.grid}>
                    {contractData.tokens.map((token) => (
                      <NFTCard
                        key={`${token.contractAddress}-${token.tokenId}`}
                        token={token}
                        showOwner={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
