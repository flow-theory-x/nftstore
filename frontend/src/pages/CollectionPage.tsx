import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CONTRACT_ADDRESS, OPENSEA_NETWORK } from "../constants";
import { NftContractService } from "../utils/nftContract";
import { MemberService } from "../utils/memberService";
import { Spinner } from "../components/Spinner";
import copyIcon from "../assets/icons/copy.svg";
import discordIcon from "../assets/icons/discord.png";
import styles from "./CollectionPage.module.css";

interface ContractInfo {
  contractAddress: string;
  contractName: string;
  totalSupply: number;
  symbol: string;
  owner: string;
  maxFeeRate: number;
  mintFee: string;
  creators: string[];
}

export const CollectionPage: React.FC = () => {
  const [nftCollectionFeatures, setNftCollectionFeatures] = useState<{
    contractAddress: string;
    contractName: string;
    totalSupply: number;
    creatorCount: number;
  }[]>([]);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [creatorMembers, setCreatorMembers] = useState<Map<string, any>>(new Map());
  const [loadingNft, setLoadingNft] = useState(true);
  const [loadingContractInfo, setLoadingContractInfo] = useState(true);
  const [nftLoadingMessage, setNftLoadingMessage] = useState("Loading NFT collections...");
  const [copiedDiscordId, setCopiedDiscordId] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // NFTコレクション情報を取得
  useEffect(() => {
    const fetchNftCollectionFeatures = async () => {
      try {
        setLoadingNft(true);
        console.log(`🔍 Fetching NFT collection features for contract: ${CONTRACT_ADDRESS}`);
        
        setNftLoadingMessage(`Processing NFT contract...`);
        
        const address = CONTRACT_ADDRESS;
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
        
        try {
          setNftLoadingMessage(`Connecting to contract: ${shortAddress}`);
          const contractService = new NftContractService(address);
          
          setNftLoadingMessage(`Getting name for ${shortAddress}...`);
          const contractName = await contractService.getName();
          
          setNftLoadingMessage(`Getting supply for ${shortAddress}...`);
          const totalSupply = await contractService.getTotalSupply();
          
          setNftLoadingMessage(`Getting creators for ${shortAddress}...`);
          const creators = await contractService.getCreators();
          
          const result = {
            contractAddress: address,
            contractName: contractName || `NFT ${shortAddress}`,
            totalSupply: totalSupply || 0,
            creatorCount: creators.length || 0,
          };
          
          // totalSupplyが0より大きい場合のみ追加
          if (result.totalSupply > 0) {
            setNftCollectionFeatures([result]);
            console.log(`✅ Fetched NFT contract with ${result.totalSupply} tokens`);
          } else {
            setNftCollectionFeatures([]);
            console.log(`❌ NFT contract has no tokens`);
          }
        } catch (err) {
          console.warn(`Failed to fetch NFT contract info for ${address}:`, err);
          setNftCollectionFeatures([]);
        }
      } catch (err) {
        console.error("Failed to fetch NFT collection features:", err);
        setNftCollectionFeatures([]);
      } finally {
        setLoadingNft(false);
      }
    };

    fetchNftCollectionFeatures();
  }, []);

  // コントラクト詳細情報を取得
  useEffect(() => {
    const fetchContractInfo = async () => {
      try {
        setLoadingContractInfo(true);
        console.log(`🔍 Fetching detailed contract info for: ${CONTRACT_ADDRESS}`);
        
        const contractService = new NftContractService(CONTRACT_ADDRESS);
        
        const [
          contractName,
          symbol,
          totalSupply,
          maxFeeRate,
          mintFee,
          contractInfoData,
          creators
        ] = await Promise.all([
          contractService.getName().catch(() => "Unknown"),
          contractService.getSymbol().catch(() => "Unknown"),
          contractService.getTotalSupply().catch(() => 0),
          contractService.getMaxFeeRate().catch(() => 0),
          contractService.getMintFee().catch(() => "0"),
          contractService.getContractInfo().catch(() => ({ creator: "Unknown" })),
          contractService.getCreators().catch(() => [])
        ]);

        setContractInfo({
          contractAddress: CONTRACT_ADDRESS,
          contractName: contractName || "Unknown",
          symbol: symbol || "Unknown",
          totalSupply: totalSupply || 0,
          owner: contractInfoData.creator || "Unknown",
          maxFeeRate: Number(maxFeeRate) || 0,
          mintFee: mintFee || "0",
          creators: creators || []
        });

        console.log(`✅ Fetched contract info:`, {
          name: contractName,
          symbol,
          totalSupply,
          maxFeeRate,
          mintFee
        });
      } catch (err) {
        console.error("Failed to fetch contract info:", err);
        setContractInfo(null);
      } finally {
        setLoadingContractInfo(false);
      }
    };

    fetchContractInfo();
  }, []);

  // クリエイターのDiscord情報を取得
  useEffect(() => {
    const fetchCreatorMembers = async () => {
      if (!contractInfo || contractInfo.creators.length === 0) {
        return;
      }

      try {
        console.log(`🔍 Fetching Discord info for ${contractInfo.creators.length} creators`);
        const memberService = new MemberService();
        const memberMap = new Map<string, any>();

        // バッチで取得
        const memberInfos = await memberService.getMemberInfoBatch(contractInfo.creators);
        
        Object.entries(memberInfos).forEach(([address, info]) => {
          if (info) {
            memberMap.set(address.toLowerCase(), info);
            console.log(`📝 Creator ${address}:`, {
              DiscordId: info.DiscordId || info.discord_id,
              Nick: info.Nick || info.nickname,
              Name: info.Name || info.name,
              Username: info.Username || info.username,
              Icon: info.Icon,
              avatar_url: info.avatar_url
            });
          }
        });

        setCreatorMembers(memberMap);
        console.log(`✅ Fetched Discord info for ${memberMap.size} creators`);
      } catch (err) {
        console.error("Failed to fetch creator Discord info:", err);
      }
    };

    fetchCreatorMembers();
  }, [contractInfo]);

  // Discord IDをコピー
  const handleCopyDiscordId = (discordId: string) => {
    navigator.clipboard.writeText(discordId).then(() => {
      setCopiedDiscordId(discordId);
      setTimeout(() => setCopiedDiscordId(null), 2000);
    });
  };

  // EOAアドレスをコピー
  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address).then(() => {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Collection</h1>
      <div className={styles.content}>
        {/* Feature Creator Collection */}
        <div className={styles.featureSection}>
          <h2 className={styles.sectionTitle}>Feature Creator Collection</h2>
          {loadingNft ? (
            <Spinner size="medium" text={nftLoadingMessage} />
          ) : nftCollectionFeatures.length > 0 ? (
            <div className={styles.featureGrid}>
              {nftCollectionFeatures.map((feature) => (
                <div key={feature.contractAddress} className={styles.collectionCard}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.collectionTitle}>{feature.contractName}</h3>
                    <span className={styles.creatorBadge}>
                      {feature.creatorCount} creators
                    </span>
                  </div>
                  
                  <div className={styles.cardContent}>
                    <p className={styles.collectionDescription}>
                      A dynamic NFT collection featuring unique digital assets with customizable features and community-driven content.
                    </p>
                    
                    <div className={styles.quickActions}>
                      <a href={`/collection/creator`} className={styles.primaryAction}>
                        👥 Browse Creators
                      </a>
                      <a href={`/mint`} className={styles.secondaryAction}>
                        ➕ Create NFT
                      </a>
                    </div>
                    
                    <div className={styles.externalLinks}>
                      <a href={`/tokens/${feature.contractAddress}`} className={styles.externalLink}>
                        📋 Tokens
                      </a>
                      <a href={`https://opensea.io/item/${OPENSEA_NETWORK}/${feature.contractAddress}`} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         className={styles.externalLink}>
                        🌊 OpenSea
                      </a>
                      <a href={`/collection`} className={styles.externalLink}>
                        ℹ️ Details
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <h3>No Featured Collections</h3>
              <p>No NFT collections are currently featured</p>
              <a href="/mint" className={styles.createButton}>
                ➕ Create First NFT
              </a>
            </div>
          )}
        </div>


        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Collection Information</h2>
          {loadingContractInfo ? (
            <Spinner size="medium" text="Loading contract information..." />
          ) : contractInfo ? (
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Collection Name:</span>
                <span className={styles.infoValue}>{contractInfo.contractName}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Symbol:</span>
                <span className={styles.infoValue}>{contractInfo.symbol}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Total Supply:</span>
                <span className={styles.infoValue}>{contractInfo.totalSupply.toLocaleString()}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Max Royalty Fee Rate:</span>
                <span className={styles.infoValue}>
                  {contractInfo.maxFeeRate}% ({contractInfo.maxFeeRate * 100} basis points)
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Mint Fee:</span>
                <span className={styles.infoValue}>
                  {contractInfo.mintFee} {import.meta.env.VITE_CURRENCY_SYMBOL || 'ETH'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Total Creators:</span>
                <span className={styles.infoValue}>{contractInfo.creators.length}</span>
              </div>
            </div>
          ) : (
            <p>Failed to load contract information</p>
          )}
        </div>
      </div>
    </div>
  );
};
