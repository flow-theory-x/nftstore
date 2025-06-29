import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { NFTCard } from "../components/NFTCard";
import { Spinner } from "../components/Spinner";
import { NftContractService } from "../utils/nftContract";
import type { NFTToken } from "../types";
import { useWallet } from "../hooks/useWallet";
import { useOwnPageWalletChange } from "../hooks/useWalletAddressChange";
import { useAddressInfo } from "../hooks/useAddressInfo";
import { AddressDisplayUtils } from "../utils/addressDisplayUtils";
import { copyToClipboard } from "../utils/clipboardUtils";
import { CONTRACT_ADDRESS, isTBAEnabled } from "../constants";
import { MemberInfoCard } from "../components/MemberInfoCard";
import { TbaService } from "../utils/tbaService";
import styles from "./OwnedTokensPage.module.css";

export const OwnedTokensPage: React.FC = () => {
  const navigate = useNavigate();
  const { contractAddress, address } = useParams<{
    contractAddress?: string;
    address?: string;
  }>();
  const { walletState } = useWallet();

  // URLでEOAが指定されていない場合の処理
  useEffect(() => {
    if (!address && !walletState.isConnected) {
      // 未接続の場合はHOMEにリダイレクト
      navigate("/", { replace: true });
    }
  }, [address, walletState.isConnected, navigate]);

  // addressを決定（URLパラメータまたは接続中のウォレットアドレス）
  const effectiveAddress = address || (walletState.isConnected ? walletState.address : null);

  // 有効なアドレスがない場合はSpinner表示
  if (!effectiveAddress) {
    return <Spinner />;
  }
  
  // ウォレットアドレス切り替え検知
  useOwnPageWalletChange();
  const [tokens, setTokens] = useState<NFTToken[]>([]);
  const [contractName, setContractName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [memberInfoFetched, setMemberInfoFetched] = useState(false);
  
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
    walletState.address?.toLowerCase() === effectiveAddress?.toLowerCase();

  // Check if address is TBA and get source NFT
  useEffect(() => {
    const checkTBA = async () => {
      if (!effectiveAddress || !isTBAEnabled()) {
        setMemberInfoFetched(true);
        return;
      }

      try {
        setTbaCheckLoading(true);
        const tbaService = new TbaService();
        
        console.log(`🔍 Checking if ${effectiveAddress} is TBA account...`);
        const isTBA = await tbaService.isTBAAccount(effectiveAddress);
        setIsTbaAccount(isTBA);
        
        if (isTBA) {
          console.log(`🎯 Address is TBA, finding source NFT...`);
          const sourceToken = await tbaService.findTBASourceToken(effectiveAddress);
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
  }, [effectiveAddress]);

  const addressInfo = useAddressInfo(effectiveAddress);

  // Update memberInfoFetched when address info is loaded
  useEffect(() => {
    if (!addressInfo.loading && effectiveAddress) {
      setMemberInfoFetched(true);
    }
  }, [addressInfo.loading, effectiveAddress]);


  // Fetch tokens when member info is ready
  useEffect(() => {
    const fetchTokens = async () => {
      if (!effectiveAddress || !memberInfoFetched) {
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
          effectiveAddress,
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
  }, [contractAddress, effectiveAddress, memberInfoFetched]);



  if (loading && tokens.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          {isOwnAddress
            ? "My Tokens"
            : `Tokens owned by ${AddressDisplayUtils.formatAddress(effectiveAddress || "")}`}
        </h1>
        
        {/* メンバー情報を先に表示 */}
        <MemberInfoCard
          memberInfo={addressInfo.memberInfo}
          loading={addressInfo.loading}
          address={effectiveAddress || ""}
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
            : `Tokens owned by ${AddressDisplayUtils.formatAddress(effectiveAddress || "")}`}
        </h1>
      </div>

      {/* メンバー情報表示 */}
      <MemberInfoCard
        memberInfo={addressInfo.memberInfo}
        loading={addressInfo.loading}
        address={effectiveAddress || ""}
        isTbaAccount={isTbaAccount}
        tbaSourceNFT={tbaSourceNFTDetail}
        tbaCheckLoading={tbaCheckLoading}
        creatorName={addressInfo.creatorName}
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
                    {AddressDisplayUtils.formatAddress(contractAddress || CONTRACT_ADDRESS)}
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
