import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CONTRACT_ADDRESS } from "../constants";
import { NftContractService } from "../utils/nftContract";
import { MemberService } from "../utils/memberService";
import { withCACasher } from "../utils/caCasherClient";
import { Spinner } from "../components/Spinner";
import copyIcon from "../assets/icons/copy.svg";
import discordIcon from "../assets/icons/discord.png";
import styles from "./CollectionCreatorPage.module.css";

interface ContractInfo {
  contractAddress: string;
  contractName: string;
  creators: string[];
}

export const CollectionCreatorPage: React.FC = () => {
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [creatorMembers, setCreatorMembers] = useState<Map<string, any>>(
    new Map()
  );
  const [creatorNames, setCreatorNames] = useState<Map<string, string>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [copiedDiscordId, setCopiedDiscordId] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [creatorStats, setCreatorStats] = useState<Map<string, {
    createdCount: number | null;
    ownedCount: number | null;
  }>>(new Map());

  // コントラクト情報とクリエイターリストを取得
  useEffect(() => {
    const fetchCreators = async () => {
      try {
        setLoading(true);
        console.log(`🔍 Fetching creators for: ${CONTRACT_ADDRESS}`);

        const contractService = new NftContractService(CONTRACT_ADDRESS);

        const [contractName, creators] = await Promise.all([
          contractService.getName().catch(() => "Unknown Collection"),
          contractService.getCreators().catch(() => []),
        ]);

        setContractInfo({
          contractAddress: CONTRACT_ADDRESS,
          contractName: contractName || "Unknown Collection",
          creators: creators || [],
        });

        console.log(
          `✅ Fetched ${creators.length} creators for ${contractName}`
        );
      } catch (err) {
        console.error("Failed to fetch creators:", err);
        setContractInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCreators();
  }, []);

  // クリエイターのDiscord情報を取得
  useEffect(() => {
    const fetchCreatorMembers = async () => {
      if (!contractInfo || contractInfo.creators.length === 0) {
        return;
      }

      try {
        console.log(
          `🔍 Fetching Discord info for ${contractInfo.creators.length} creators`
        );
        const memberService = new MemberService();
        const memberMap = new Map<string, any>();

        // バッチで取得
        const memberInfos = await memberService.getMemberInfoBatch(
          contractInfo.creators
        );

        Object.entries(memberInfos).forEach(([address, info]) => {
          if (info) {
            memberMap.set(address.toLowerCase(), info);
            console.log(`📝 Creator ${address}:`, {
              DiscordId: info.DiscordId || info.discord_id,
              Nick: info.Nick || info.nickname,
              Name: info.Name || info.name,
              Username: info.Username || info.username,
              Icon: info.Icon,
              avatar_url: info.avatar_url,
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
  }, [contractInfo]);

  // クリエイターの統計情報を取得
  useEffect(() => {
    const fetchCreatorStats = async () => {
      if (!contractInfo || contractInfo.creators.length === 0) {
        return;
      }

      try {
        console.log(`📊 Fetching stats for ${contractInfo.creators.length} creators`);
        const contractService = new NftContractService(CONTRACT_ADDRESS);
        const statsMap = new Map<string, { createdCount: number | null; ownedCount: number | null }>();

        // Initialize all creators with null values (loading state)
        contractInfo.creators.forEach(creator => {
          statsMap.set(creator.toLowerCase(), { createdCount: null, ownedCount: null });
        });
        setCreatorStats(new Map(statsMap));

        // Fetch stats for each creator
        for (const creator of contractInfo.creators) {
          try {
            console.log(`📊 Fetching stats for creator: ${creator}`);
            
            // Get created tokens count
            const createdTokens = await contractService.getCreatorTokens(creator);
            const createdCount = createdTokens.length;
            
            // Get owned tokens count
            const ownedTokens = await contractService.getTokensByOwner(creator);
            const ownedCount = ownedTokens.length;
            
            // Update stats
            statsMap.set(creator.toLowerCase(), { 
              createdCount, 
              ownedCount 
            });
            setCreatorStats(new Map(statsMap));
            
            console.log(`✅ Stats for ${creator}: created ${createdCount}, owned ${ownedCount}`);
          } catch (err) {
            console.error(`Failed to fetch stats for creator ${creator}:`, err);
            // Set to 0 if there's an error
            statsMap.set(creator.toLowerCase(), { 
              createdCount: 0, 
              ownedCount: 0 
            });
            setCreatorStats(new Map(statsMap));
          }
        }
      } catch (err) {
        console.error("Failed to fetch creator stats:", err);
      }
    };

    fetchCreatorStats();
  }, [contractInfo]);

  // Discord IDをコピー
  const handleCopyDiscordId = (discordId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("💬 Discord ID copy clicked - event propagation stopped");
    navigator.clipboard.writeText(discordId).then(() => {
      setCopiedDiscordId(discordId);
      setTimeout(() => setCopiedDiscordId(null), 2000);
    });
  };

  // EOAアドレスをコピー
  const handleCopyAddress = (address: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("📋 Address copy clicked - event propagation stopped");
    navigator.clipboard.writeText(address).then(() => {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Collection Creators</h1>
        <div className={styles.loadingContainer}>
          <Spinner size="large" text="Loading creators..." />
        </div>
      </div>
    );
  }

  if (!contractInfo) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Collection Creators</h1>
        <div className={styles.errorContainer}>
          <p>Failed to load creator information</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Collection Creators</h1>
        <p className={styles.subtitle}>
          Discover the talented creators behind{" "}
          <strong>{contractInfo.contractName}</strong>
        </p>
      </div>

      <div className={styles.statsSection}>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>
            {contractInfo.creators.length}
          </span>
          <span className={styles.statLabel}>Total Creators</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{creatorMembers.size}</span>
          <span className={styles.statLabel}>Verified Creators</span>
        </div>
      </div>

      {contractInfo.creators.length > 0 ? (
        <div className={styles.creatorsGrid}>
          {contractInfo.creators.map((creator, index) => {
            const memberInfo = creatorMembers.get(creator.toLowerCase());
            const discordId = memberInfo?.DiscordId || memberInfo?.discord_id;
            // 優先順位: getCreatorName > Nick > Name > Username
            const contractName = creatorNames.get(creator.toLowerCase());
            const displayName =
              contractName ||
              memberInfo?.Nick ||
              memberInfo?.nickname ||
              memberInfo?.Name ||
              memberInfo?.name ||
              memberInfo?.Username ||
              memberInfo?.username;
            const avatarUrl = memberInfo?.Icon || memberInfo?.avatar_url;
            const stats = creatorStats.get(creator.toLowerCase()) || { createdCount: null, ownedCount: null };

            return (
              <Link 
                key={creator} 
                to={`/creator/${creator}`}
                className={styles.creatorCard}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className={styles.creatorHeader}>
                  {memberInfo ? (
                    <div className={styles.avatarContainer}>
                      <img
                        src={avatarUrl || discordIcon}
                        alt={`${displayName || "Creator"} avatar`}
                        className={styles.avatar}
                        onError={(e) => {
                          if (e.currentTarget.src !== discordIcon) {
                            console.error(
                              `Failed to load Discord avatar for ${discordId}:`,
                              avatarUrl
                            );
                            e.currentTarget.src = discordIcon;
                          }
                        }}
                      />
                      <div className={styles.discordBadge}>Discord</div>
                    </div>
                  ) : (
                    <div className={styles.defaultAvatar}>👤</div>
                  )}

                  <div className={styles.creatorInfo}>
                    {displayName ? (
                      <h3 className={styles.creatorName}>{displayName}</h3>
                    ) : (
                      <h3 className={styles.creatorName}>
                        Creator #{index + 1}
                      </h3>
                    )}

                    <div className={styles.addressContainer}>
                      <span className={styles.creatorAddress}>
                        {creator.slice(0, 6)}...{creator.slice(-4)}
                      </span>
                      <div className={styles.copyContainer}>
                        <img
                          src={copyIcon}
                          alt="Copy"
                          width="16"
                          height="16"
                          onClick={(e) => handleCopyAddress(creator, e)}
                          className={styles.copyIcon}
                          title="Copy address"
                        />
                        {copiedAddress === creator && (
                          <div className={styles.tooltip}>Copied!</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.creatorActions} style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%" }}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(`📋 Navigating to creator: ${creator}`);
                      window.location.href = `/creator/${creator}`;
                    }}
                    className={styles.actionButton}
                    style={{
                      border: "1px solid #ddd",
                      background: "#f8f9fa",
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.85em",
                      transition: "background-color 0.2s",
                      flex: 1,
                      textAlign: "center" as const,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#e9ecef";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f8f9fa";
                    }}
                  >
                    created: {stats.createdCount !== null ? stats.createdCount : '-'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(
                        `🏠 Navigating to collection: /own/${creator}`
                      );
                      window.location.href = `/own/${creator}`;
                    }}
                    className={styles.actionButton}
                    style={{
                      border: "1px solid #ddd",
                      background: "#f8f9fa",
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.85em",
                      transition: "background-color 0.2s",
                      flex: 1,
                      textAlign: "center" as const,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#e9ecef";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f8f9fa";
                    }}
                  >
                    own: {stats.ownedCount !== null ? stats.ownedCount : '-'}
                  </button>
                  {discordId ? (
                    <div className={styles.discordAction} style={{ position: "relative", flex: 1 }}>
                      <button
                        onClick={(e) => handleCopyDiscordId(discordId, e)}
                        className={styles.discordButton}
                        title={`Copy Discord ID: ${discordId}`}
                        style={{
                          border: "1px solid #5865F2",
                          background: "#5865F2",
                          color: "white",
                          cursor: "pointer",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "0.85em",
                          transition: "background-color 0.2s",
                          width: "100%",
                          textAlign: "center" as const,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#4752C4";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#5865F2";
                        }}
                      >
                        Discord
                      </button>
                      {copiedDiscordId === discordId && (
                        <div className={styles.tooltip}>Copied!</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}></div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h3>No Creators Found</h3>
          <p>This collection doesn't have any registered creators yet.</p>
        </div>
      )}
    </div>
  );
};
