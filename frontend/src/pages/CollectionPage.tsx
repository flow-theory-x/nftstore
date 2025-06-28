import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CONTRACT_ADDRESS, OPENSEA_NETWORK, TBA_REGISTRY_ADDRESS, TBA_ACCOUNT_IMPLEMENTATION } from "../constants";
import { NftContractService } from "../utils/nftContract";
import { MemberService } from "../utils/memberService";
import { Spinner } from "../components/Spinner";
import copyIcon from "../assets/icons/copy.svg";
import discordIcon from "../assets/icons/discord.png";
import creatorIcon from "../assets/icons/creator.svg";
import { withCACasher } from "../utils/caCasherClient";
import { useAddressInfo } from "../hooks/useAddressInfo";
import { AddressDisplayUtils } from "../utils/addressDisplayUtils";
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

interface CreatorPreviewProps {
  creator: string;
  index: number;
}

const CreatorPreview: React.FC<CreatorPreviewProps> = ({ creator, index }) => {
  const addressInfo = useAddressInfo(creator);
  
  // getCreatorNameで名前が取得できるCreatorのみ表示
  if (!AddressDisplayUtils.isCreatorAccount(addressInfo.creatorName)) {
    return null;
  }
  
  const avatarUrl = AddressDisplayUtils.getAvatarUrlWithCreator(
    addressInfo.creatorName,
    addressInfo.memberInfo,
    addressInfo.tbaInfo?.tbaImage,
    creatorIcon
  );
  
  const isCreator = AddressDisplayUtils.isCreatorAccount(addressInfo.creatorName);
  const borderColor = isCreator ? "#FF6B35" : "#5865F2";

  return (
    <a 
      href={`/creator/${creator}`}
      className={styles.creatorItem}
      title={addressInfo.displayName}
    >
      <div className={styles.avatarContainer}>
        <img
          src={avatarUrl || creatorIcon}
          alt={addressInfo.displayName}
          className={styles.creatorAvatar}
          style={{
            border: `3px solid ${borderColor}`
          }}
          onError={(e) => {
            if (addressInfo.memberInfo && e.currentTarget.src !== discordIcon) {
              console.error('Failed to load Discord avatar, using Discord icon');
              e.currentTarget.src = discordIcon;
            } else if (e.currentTarget.src !== creatorIcon) {
              e.currentTarget.src = creatorIcon;
            }
          }}
        />
        <div className={styles.creatorBadge}>Creator</div>
      </div>
      <span className={styles.creatorName}>{addressInfo.displayName}</span>
    </a>
  );
};

interface CreatorsListProps {
  creators: string[];
}

const CreatorsList: React.FC<CreatorsListProps> = ({ creators }) => {
  const [validCreators, setValidCreators] = useState<string[]>([]);

  useEffect(() => {
    // 実際にCreatorNameが取得できるCreatorのみを動的にフィルター
    const checkValidCreators = async () => {
      const validList: string[] = [];
      for (const creator of creators.slice(0, 8)) { // 最大8人まで確認
        try {
          const contractService = new NftContractService(CONTRACT_ADDRESS);
          const creatorName = await contractService.getCreatorName(creator);
          if (creatorName && creatorName.trim()) {
            validList.push(creator);
          }
        } catch (err) {
          // エラーの場合はスキップ
        }
      }
      setValidCreators(validList);
    };

    checkValidCreators();
  }, [creators]);

  if (validCreators.length === 0) return null;

  return (
    <div className={styles.creatorsPreview}>
      <h4 className={styles.creatorsTitle}>Creators ({validCreators.length})</h4>
      <div className={styles.creatorsGrid}>
        {validCreators.slice(0, 6).map((creator, index) => (
          <CreatorPreview key={creator} creator={creator} index={index} />
        ))}
        {validCreators.length > 6 && (
          <a href="/creator" className={styles.moreCreators}>
            +{validCreators.length - 6} more
          </a>
        )}
      </div>
    </div>
  );
};

export const CollectionPage: React.FC = () => {
  const [nftCollectionFeatures, setNftCollectionFeatures] = useState<{
    contractAddress: string;
    contractName: string;
    totalSupply: number;
    creatorCount: number;
  }[]>([]);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [creatorMembers, setCreatorMembers] = useState<Map<string, any>>(new Map());
  const [creatorNames, setCreatorNames] = useState<Map<string, string>>(new Map());
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
      
      // 既に同じクリエイターリストで取得済みの場合はスキップ
      if (creatorMembers.size > 0 && creatorNames.size > 0) {
        console.log('📋 Creator info already fetched, skipping...');
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

        // Fetch creator names from contract
        const nameMap = new Map<string, string>();
        for (const creator of contractInfo.creators) {
          try {
            const contractCreatorName = await withCACasher(
              CONTRACT_ADDRESS,
              'getCreatorName',
              [creator],
              async () => {
                const contractService = new NftContractService(CONTRACT_ADDRESS);
                return await contractService.getCreatorName(creator);
              }
            );
            if (contractCreatorName && contractCreatorName.trim()) {
              nameMap.set(creator.toLowerCase(), contractCreatorName);
              console.log(`📝 Creator name from contract for ${creator}:`, contractCreatorName);
            }
          } catch (err) {
            console.warn(`Failed to fetch creator name for ${creator}:`, err);
          }
        }
        setCreatorNames(nameMap);
      } catch (err) {
        console.error("Failed to fetch creator Discord info:", err);
      }
    };

    fetchCreatorMembers();
  }, [contractInfo?.creators]);

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

                    {/* Creator一覧 - getCreatorNameで取れるCreatorのみ */}
                    {contractInfo && contractInfo.creators.length > 0 && (
                      <CreatorsList creators={contractInfo.creators} />
                    )}
                    
                    <div className={styles.quickActions}>
                      <a href="/creator" className={styles.primaryAction}>
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
                      <a href="/" className={styles.externalLink}>
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
                <span className={styles.infoLabel}>NFT Contract Address:</span>
                <div className={styles.addressContainer}>
                  <span className={styles.infoValue}>{CONTRACT_ADDRESS}</span>
                  <button
                    onClick={() => handleCopyAddress(CONTRACT_ADDRESS)}
                    className={styles.copyButton}
                    title="Copy NFT contract address"
                  >
                    <img src={copyIcon} alt="Copy" width="16" height="16" />
                  </button>
                  {copiedAddress === CONTRACT_ADDRESS && (
                    <span className={styles.copyTooltip}>Copied!</span>
                  )}
                </div>
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
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>TBA Registry Address:</span>
                <div className={styles.addressContainer}>
                  <span className={styles.infoValue}>{TBA_REGISTRY_ADDRESS}</span>
                  <button
                    onClick={() => handleCopyAddress(TBA_REGISTRY_ADDRESS)}
                    className={styles.copyButton}
                    title="Copy TBA registry address"
                  >
                    <img src={copyIcon} alt="Copy" width="16" height="16" />
                  </button>
                  {copiedAddress === TBA_REGISTRY_ADDRESS && (
                    <span className={styles.copyTooltip}>Copied!</span>
                  )}
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>TBA Implementation Address:</span>
                <div className={styles.addressContainer}>
                  <span className={styles.infoValue}>{TBA_ACCOUNT_IMPLEMENTATION}</span>
                  <button
                    onClick={() => handleCopyAddress(TBA_ACCOUNT_IMPLEMENTATION)}
                    className={styles.copyButton}
                    title="Copy TBA implementation address"
                  >
                    <img src={copyIcon} alt="Copy" width="16" height="16" />
                  </button>
                  {copiedAddress === TBA_ACCOUNT_IMPLEMENTATION && (
                    <span className={styles.copyTooltip}>Copied!</span>
                  )}
                </div>
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
