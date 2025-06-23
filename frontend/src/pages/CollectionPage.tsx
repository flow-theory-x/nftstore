import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CONTRACT_ADDRESS } from "../constants";
import { NftContractService } from "../utils/nftContract";
import { MemberService } from "../utils/memberService";
import { Spinner } from "../components/Spinner";
import copyIcon from "../assets/icons/copy.svg";
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
  const { contractAddress } = useParams<{ contractAddress?: string }>();
  const [nftCollectionFeatures, setNftCollectionFeatures] = useState<{
    contractAddress: string;
    contractName: string;
    totalSupply: number;
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
          
          const result = {
            contractAddress: address,
            contractName: contractName || `NFT ${shortAddress}`,
            totalSupply: totalSupply || 0,
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
          maxFeeRate: maxFeeRate || 0,
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
        {/* NFT Collection Features */}
        <div className={styles.placeholder}>
          <h3>Collection NFT Features</h3>
          {loadingNft ? (
            <Spinner size="medium" text={nftLoadingMessage} />
          ) : nftCollectionFeatures.length > 0 ? (
            <ul>
              {nftCollectionFeatures.map((feature) => (
                <li key={feature.contractAddress}>
                  <a href={`/tokens/${feature.contractAddress}`}>
                    <span>{feature.contractName}</span>
                    <span style={{ 
                      fontSize: '0.9em', 
                      opacity: 0.8, 
                      fontWeight: 'normal',
                      marginLeft: '8px'
                    }}>
                      ({feature.totalSupply})
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>No NFT collections configured</p>
          )}
        </div>


        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Collection Information</h2>
          {loadingContractInfo ? (
            <Spinner size="medium" text="Loading contract information..." />
          ) : contractInfo ? (
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Contract Address:</span>
                <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                  {contractInfo.contractAddress}
                </span>
              </div>
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
                <span className={styles.infoLabel}>Contract Owner:</span>
                <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                  {contractInfo.owner.slice(0, 6)}...{contractInfo.owner.slice(-4)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Max Royalty Fee Rate:</span>
                <span className={styles.infoValue}>
                  {contractInfo.maxFeeRate / 100}% ({contractInfo.maxFeeRate} basis points)
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
              {contractInfo.creators.length > 0 && (
                <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.infoLabel}>Creators:</span>
                  <div className={styles.infoValue}>
                    {contractInfo.creators.map((creator, index) => {
                      const memberInfo = creatorMembers.get(creator.toLowerCase());
                      const discordId = memberInfo?.DiscordId || memberInfo?.discord_id;
                      // 優先順位: Nick > Name > Username
                      const displayName = memberInfo?.Nick || memberInfo?.nickname || 
                                        memberInfo?.Name || memberInfo?.name || 
                                        memberInfo?.Username || memberInfo?.username;
                      const avatarUrl = memberInfo?.Icon || memberInfo?.avatar_url;
                      
                      return (
                        <div key={creator} style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: index < contractInfo.creators.length - 1 ? '8px' : '0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                            <a
                              href={`/creator/${creator}`}
                              style={{
                                textDecoration: 'none',
                                color: 'inherit',
                                fontFamily: 'monospace', 
                                fontSize: '0.9em'
                              }}
                            >
                              {creator.slice(0, 6)}...{creator.slice(-4)}
                            </a>
                            <img
                              src={copyIcon}
                              alt="Copy"
                              width="14"
                              height="14"
                              onClick={() => handleCopyAddress(creator)}
                              style={{
                                cursor: 'pointer',
                                opacity: 0.6
                              }}
                              title="Copy address"
                            />
                            {copiedAddress === creator && (
                              <div style={{
                                position: 'absolute',
                                top: '-28px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#4caf50',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                                zIndex: 1000
                              }}>
                                Copied!
                              </div>
                            )}
                          </div>
                          {discordId && avatarUrl && (
                            <div style={{ position: 'relative' }}>
                              <img
                                src={avatarUrl}
                                alt={`Discord avatar for ${discordId}`}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  cursor: 'pointer',
                                  border: '2px solid #5865F2'
                                }}
                                onClick={() => handleCopyDiscordId(discordId)}
                                title={`Copy Discord ID: ${discordId}`}
                                onError={(e) => {
                                  console.error(`Failed to load Discord avatar for ${discordId}:`, avatarUrl);
                                  e.currentTarget.style.display = 'none';
                                }}
                                onLoad={() => {
                                  console.log(`Successfully loaded Discord avatar for ${discordId}:`, avatarUrl);
                                }}
                              />
                              {copiedDiscordId === discordId && (
                                <div style={{
                                  position: 'absolute',
                                  top: '-28px',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  backgroundColor: '#4caf50',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  whiteSpace: 'nowrap',
                                  pointerEvents: 'none',
                                  zIndex: 1000
                                }}>
                                  Copied!
                                </div>
                              )}
                            </div>
                          )}
                          {displayName && (
                            <a
                              href={`/own/${creator}`}
                              style={{
                                textDecoration: 'none',
                                fontSize: '0.8em',
                                color: '#5865F2',
                                fontWeight: 'bold'
                              }}
                            >
                              @{displayName}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>Failed to load contract information</p>
          )}
        </div>
      </div>
    </div>
  );
};
