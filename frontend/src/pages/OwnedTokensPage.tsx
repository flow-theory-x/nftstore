import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { NFTCard } from "../components/NFTCard";
import { Spinner } from "../components/Spinner";
import { NftContractService } from "../utils/nftContract";
import type { NFTToken } from "../types";
import { useWallet } from "../hooks/useWallet";
import { useOwnPageWalletChange } from "../hooks/useWalletAddressChange";
import { CONTRACT_ADDRESS, isTBAEnabled } from "../constants";
import { memberService } from "../utils/memberService";
import { caCasherClient } from "../utils/caCasherClient";
import type { MemberInfo } from "../types";
import { MemberInfoCard } from "../components/MemberInfoCard";
import { TbaService } from "../utils/tbaService";
import styles from "./OwnedTokensPage.module.css";

export const OwnedTokensPage: React.FC = () => {
  const { contractAddress, address } = useParams<{
    contractAddress?: string;
    address: string;
  }>();
  const { walletState } = useWallet();
  
  // ウォレットアドレス切り替え検知
  useOwnPageWalletChange();
  const [tokens, setTokens] = useState<NFTToken[]>([]);
  const [contractName, setContractName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberInfoFetched, setMemberInfoFetched] = useState(false);
  const [creatorName, setCreatorName] = useState<string>("");
  
  // TBA-related state
  const [isTbaAccount, setIsTbaAccount] = useState(false);
  const [tbaSourceNFT, setTbaSourceNFT] = useState<{contractAddress: string, tokenId: string} | null>(null);
  const [tbaSourceNFTDetail, setTbaSourceNFTDetail] = useState<NFTToken | null>(null);
  const [tbaCheckLoading, setTbaCheckLoading] = useState(false);

  const handleRefresh = () => {
    // ページをリロードして最新データを取得
    window.location.reload();
  };

  const isOwnAddress =
    walletState.address?.toLowerCase() === address?.toLowerCase();

  // Check if address is TBA and get source NFT
  useEffect(() => {
    const checkTBA = async () => {
      if (!address || !isTBAEnabled()) {
        setMemberInfoFetched(true);
        return;
      }

      try {
        setTbaCheckLoading(true);
        const tbaService = new TbaService();
        
        console.log(`🔍 Checking if ${address} is TBA account...`);
        const isTBA = await tbaService.isTBAAccount(address);
        setIsTbaAccount(isTBA);
        
        if (isTBA) {
          console.log(`🎯 Address is TBA, finding source NFT...`);
          const sourceToken = await tbaService.findTBASourceToken(address);
          setTbaSourceNFT(sourceToken);
          
          if (sourceToken) {
            console.log(`📋 Found source NFT: ${sourceToken.contractAddress}#${sourceToken.tokenId}`);
            // Fetch the source NFT details
            try {
              const contractService = new NftContractService(sourceToken.contractAddress);
              const owner = await contractService.getOwnerOf(sourceToken.tokenId);
              const tokenURI = await contractService.getTokenURI(sourceToken.tokenId);
              
              const nftDetail: NFTToken = {
                id: sourceToken.tokenId,
                tokenId: sourceToken.tokenId,
                owner,
                tokenURI,
                contractAddress: sourceToken.contractAddress,
              };
              setTbaSourceNFTDetail(nftDetail);
            } catch (err) {
              console.error('Failed to fetch source NFT details:', err);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check TBA status:', error);
        setIsTbaAccount(false);
        setTbaSourceNFT(null);
        setTbaSourceNFTDetail(null);
      } finally {
        setTbaCheckLoading(false);
      }
    };

    checkTBA();
  }, [address]);

  // Then, fetch member info
  useEffect(() => {
    const fetchMemberInfo = async () => {
      if (!address) {
        setMemberInfoFetched(true);
        return;
      }

      try {
        setMemberLoading(true);
        console.log(`🔍 Fetching member info for: ${address}`);
        
        // Get creator name from contract
        try {
          const contractCreatorName = await caCasherClient.call('getCreatorName', [address]);
          if (contractCreatorName && contractCreatorName.trim()) {
            setCreatorName(contractCreatorName);
            console.log("📝 Creator name from contract:", contractCreatorName);
          }
        } catch (err) {
          console.warn("Failed to fetch creator name from contract:", err);
        }
        
        const info = await memberService.getMemberInfo(address);
        setMemberInfo(info);
        console.log(`📋 Member info result:`, info);
      } catch (error) {
        console.error('Failed to fetch member info:', error);
        setMemberInfo(null);
      } finally {
        setMemberLoading(false);
        setMemberInfoFetched(true);
      }
    };

    fetchMemberInfo();
  }, [address]);


  // Fetch tokens when member info is ready
  useEffect(() => {
    const fetchTokens = async () => {
      if (!address || !memberInfoFetched) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setTokens([]); // Clear previous tokens
        
        const contractAddr = contractAddress || CONTRACT_ADDRESS;
        const contractService = new NftContractService(contractAddr);

        // 進捗メッセージを更新
        setLoadingMessage("Connecting to contract...");

        // コントラクト名を取得
        setLoadingMessage("Getting contract name...");
        const name = await contractService.getName();
        setContractName(name || `Contract ${contractAddr.slice(0, 6)}...${contractAddr.slice(-4)}`);

        // 所有トークンを取得（1件ずつ順次表示）
        const progressHandler = (message: string, tokenId?: string) => {
          setLoadingMessage(tokenId
            ? `Processing token #${tokenId}: ${message}`
            : message
          );
        };

        const tokenReadyHandler = (token: NFTToken) => {
          // 1件ずつ即座に表示
          setTokens(prev => [...prev, token].sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId)));
        };

        await contractService.getTokensByOwnerWithProgress(
          address,
          progressHandler,
          tokenReadyHandler
        );

        // 完了
        setLoadingMessage("");
        setLoading(false);
        
      } catch (err: unknown) {
        console.error("Failed to fetch tokens:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setLoading(false);
        setLoadingMessage("");
      }
    };

    fetchTokens();
  }, [contractAddress, address, memberInfoFetched]);

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

  if (loading && tokens.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          {isOwnAddress
            ? "My Tokens"
            : `Tokens owned by ${formatAddress(address || "")}`}
        </h1>
        
        {/* メンバー情報を先に表示 */}
        <MemberInfoCard
          memberInfo={memberInfo}
          loading={memberLoading}
          address={address || ""}
          isTbaAccount={isTbaAccount}
          tbaSourceNFT={tbaSourceNFTDetail}
          tbaCheckLoading={tbaCheckLoading}
        />
        
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          <Spinner size="large" text="Loading NFTs and SBTs..." />
          {loadingMessage && (
            <span style={{ fontSize: "0.9em", color: "#666" }}>
              {loadingMessage}
            </span>
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
      </div>

      {/* メンバー情報表示 */}
      <MemberInfoCard
        memberInfo={memberInfo}
        loading={memberLoading}
        address={address || ""}
        isTbaAccount={isTbaAccount}
        tbaSourceNFT={tbaSourceNFTDetail}
        tbaCheckLoading={tbaCheckLoading}
        creatorName={creatorName}
      />

      <div className={styles.stats}>
        <span className={styles.count}>
          {tokens.length} NFT/SBT{tokens.length !== 1 ? "s" : ""} found
          {contractName && ` in ${contractName}`}
        </span>
        <button onClick={handleRefresh} className={styles.refreshButton}>
          Refresh
        </button>
      </div>

      {error ? (
        <div className={styles.contractError}>
          <p>Error loading tokens: {error}</p>
          <button
            onClick={() => copyToClipboard(error)}
            className={styles.copyErrorButton}
            title="Copy error message"
          >
            Copy
          </button>
        </div>
      ) : tokens.length === 0 && !loading ? (
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
          <div className={styles.contractSection}>
            {contractName && (
              <div className={styles.contractHeader}>
                <h2 className={styles.contractTitle}>
                  <Link
                    to={`/tokens/${contractAddress || CONTRACT_ADDRESS}`}
                    className={styles.contractTitleLink}
                  >
                    {contractName}
                  </Link>
                </h2>
                <div className={styles.contractAddressContainer}>
                  <span className={styles.contractAddress}>
                    {formatAddress(contractAddress || CONTRACT_ADDRESS)}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(contractAddress || CONTRACT_ADDRESS)
                    }
                    className={styles.copyButton}
                    title="Copy contract address"
                  >
                    📋
                  </button>
                </div>
                <span className={styles.tokenCount}>
                  {tokens.length} token{tokens.length !== 1 ? "s" : ""}
                  {loading && loadingMessage && (
                    <span style={{ fontSize: '0.9em', color: '#666', marginLeft: '8px' }}>
                      ({loadingMessage})
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className={styles.grid}>
              {loading && (
                <div className={styles.nftCard} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  minHeight: '280px',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <Spinner size="medium" />
                  <span style={{ fontSize: '0.9em', color: '#666', textAlign: 'center' }}>
                    {loadingMessage || "Loading more tokens..."}
                  </span>
                </div>
              )}
              {tokens.map((token) => (
                <NFTCard
                  key={`${token.contractAddress}-${token.tokenId}`}
                  token={token}
                  showOwner={false}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
