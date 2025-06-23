import React, { useState, useEffect } from "react";
import type { MemberInfo, NFTToken } from "../types";
import { Spinner } from "./Spinner";
import { NFTCard } from "./NFTCard";
import { NftContractService } from "../utils/nftContract";
import discordIcon from "../assets/icons/discord.png";
import styles from "./MemberInfoCard.module.css";

interface MemberInfoCardProps {
  memberInfo: MemberInfo | null;
  loading: boolean;
  address: string;
  isTbaAccount?: boolean;
  tbaSourceNFT?: NFTToken | null;
  tbaCheckLoading?: boolean;
  creatorName?: string;
}

export const MemberInfoCard: React.FC<MemberInfoCardProps> = ({
  memberInfo,
  loading,
  address,
  isTbaAccount = false,
  tbaSourceNFT = null,
  tbaCheckLoading = false,
  creatorName = "",
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('📋 Copied to clipboard:', text);
    } catch (err) {
      console.error('❌ Failed to copy to clipboard:', err);
    }
  };

  // NFT metadata state for TBA avatar
  const [tbaMetadata, setTbaMetadata] = useState<any>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [contractName, setContractName] = useState<string>("");

  // Fetch NFT metadata and contract name for TBA
  useEffect(() => {
    const fetchTBAData = async () => {
      if (!isTbaAccount || !tbaSourceNFT) return;

      try {
        setMetadataLoading(true);
        const contractService = new NftContractService(
          tbaSourceNFT.contractAddress
        );

        // Fetch both metadata and contract name
        const [metadata, name] = await Promise.all([
          tbaSourceNFT.tokenURI
            ? contractService.fetchMetadata(tbaSourceNFT.tokenURI)
            : null,
          contractService.getName(),
        ]);

        setTbaMetadata(metadata);
        setContractName(name || "Unknown Contract");
      } catch (error) {
        console.error("Failed to fetch TBA data:", error);
        setTbaMetadata(null);
        setContractName("Unknown Contract");
      } finally {
        setMetadataLoading(false);
      }
    };

    fetchTBAData();
  }, [isTbaAccount, tbaSourceNFT]);

  if (loading || tbaCheckLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {tbaCheckLoading ? "Account Information" : "Member Information"}
          </h3>
        </div>
        <div className={styles.loading}>
          <Spinner
            size="small"
            text={
              tbaCheckLoading
                ? "Checking account type..."
                : "Loading member info..."
            }
          />
        </div>
      </div>
    );
  }

  // EOA (non-member) display - mimicking member display style
  if (!memberInfo && !isTbaAccount) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.profileSection}>
            <div className={styles.avatarContainer}>
              <div className={styles.eoaAvatarPlaceholder}>
                <span className={styles.eoaIcon}>👤</span>
              </div>
            </div>
            <div className={styles.nameSection}>
              <h3 className={styles.displayName}>Externally Owned Account</h3>
              <p className={styles.username}>Not registered as member</p>
            </div>
          </div>
          <div className={styles.status}>
            <span className={`${styles.statusBadge} ${styles.statusEOA}`}>
              Externally Owned Account
            </span>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.infoGrid}>
            <div className={styles.field}>
              <span className={styles.label}>Account Type</span>
              <span className={styles.value}>Externally Owned Account</span>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Member Status</span>
              <span className={styles.value}>Not registered</span>
            </div>
          </div>

          {/* アドレス情報は下部に強調表示 */}
          <div className={styles.addressSection}>
            <span className={styles.addressLabel}>Wallet Address</span>
            <span className={styles.addressValue}>{address}</span>
          </div>
        </div>
      </div>
    );
  }

  // TBA Account display - mimicking member display style
  if (isTbaAccount) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.profileSection}>
            <div className={styles.avatarContainer}>
              {metadataLoading ? (
                <div
                  className={styles.avatar}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f8f9fa",
                  }}
                >
                  <Spinner size="small" />
                </div>
              ) : tbaMetadata?.image ? (
                <img
                  src={tbaMetadata.image}
                  alt={tbaMetadata.name || `NFT #${tbaSourceNFT?.tokenId}`}
                  className={styles.avatar}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const placeholder = document.createElement("div");
                    placeholder.className = styles.tbaAvatarPlaceholder;
                    placeholder.innerHTML =
                      '<span class="' + styles.tbaIcon + '">🎒</span>';
                    (e.target as HTMLImageElement).parentNode?.appendChild(
                      placeholder
                    );
                  }}
                />
              ) : (
                <div className={styles.tbaAvatarPlaceholder}>
                  <span className={styles.tbaIcon}>🎒</span>
                </div>
              )}
            </div>
            <div className={styles.nameSection}>
              <h3 className={styles.displayName}>
                {tbaMetadata?.name ||
                  `NFT #${tbaSourceNFT?.tokenId}` ||
                  "Token Bound Account"}
              </h3>
              <p className={styles.username}>{contractName}</p>
            </div>
          </div>
          <div className={styles.status}>
            <span className={`${styles.statusBadge} ${styles.statusTBA}`}>
              Token Bound Account
            </span>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.infoGrid}>
            <div className={styles.field}>
              <span className={styles.label}>Account Type</span>
              <span className={styles.value}>
                Token Bound Account (ERC-6551)
              </span>
            </div>

            {tbaSourceNFT && (
              <>
                <div className={styles.field}>
                  <span className={styles.label}>Source NFT ID</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      className={styles.value} 
                      style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => window.location.href = `/token/${tbaSourceNFT.contractAddress}/${tbaSourceNFT.tokenId}`}
                    >
                      {formatAddress(tbaSourceNFT.contractAddress)} #
                      {tbaSourceNFT.tokenId}
                    </span>
                    <button
                      onClick={() => copyToClipboard(`${tbaSourceNFT.contractAddress}#${tbaSourceNFT.tokenId}`)}
                      className={styles.copyButton}
                      title="Copy NFT ID"
                      style={{
                        background: 'none',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#666'
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className={styles.field}>
                  <span className={styles.label}>NFT Owner</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      className={styles.value}
                      style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => window.location.href = `/own/${tbaSourceNFT.owner}`}
                    >
                      {formatAddress(tbaSourceNFT.owner)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(tbaSourceNFT.owner)}
                      className={styles.copyButton}
                      title="Copy owner address"
                      style={{
                        background: 'none',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#666'
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* アドレス情報は下部に強調表示 */}
          <div className={styles.addressSection}>
            <span className={styles.addressLabel}>TBA Address</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={styles.addressValue}>{address}</span>
              <button
                onClick={() => copyToClipboard(address)}
                className={styles.copyButton}
                title="Copy TBA address"
                style={{
                  background: 'none',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#666'
                }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.profileSection}>
          <div className={styles.avatarContainer}>
            <img
              src={memberInfo.Icon || memberInfo.avatar_url || discordIcon}
              alt={
                memberInfo.Nick ||
                memberInfo.Name ||
                memberInfo.nickname ||
                memberInfo.username ||
                "Member"
              }
              className={styles.avatar}
              onError={(e) => {
                if (e.currentTarget.src !== discordIcon) {
                  console.error('Failed to load Discord avatar, using default icon');
                  e.currentTarget.src = discordIcon;
                }
              }}
            />
          </div>
          <div className={styles.nameSection}>
            <h3 className={styles.displayName}>
              {creatorName ||
                memberInfo.Nick ||
                memberInfo.Name ||
                memberInfo.nickname ||
                memberInfo.username ||
                "Unknown Member"}
            </h3>
            {(memberInfo.Username || memberInfo.username) &&
              (memberInfo.Nick || memberInfo.Name) &&
              (memberInfo.Nick || memberInfo.Name) !==
                (memberInfo.Username || memberInfo.username) && (
                <p className={styles.username}>
                  @{memberInfo.Username || memberInfo.username}
                </p>
              )}
          </div>
        </div>
        <div className={styles.status}>
          <span className={`${styles.statusBadge} ${styles.statusDiscord}`}>
            Discord User
          </span>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.infoGrid}>
          {(memberInfo.Roles || memberInfo.roles) &&
            Array.isArray(memberInfo.Roles || memberInfo.roles) &&
            (memberInfo.Roles || memberInfo.roles)!.length > 0 && (
              <div className={styles.field}>
                <span className={styles.label}>Roles</span>
                <div className={styles.rolesContainer}>
                  {(memberInfo.Roles || memberInfo.roles)!.map((role: any, index: number) => {
                    const roleName = typeof role === "object" ? role.name || role.id : role;
                    const roleColor = typeof role === "object" && role.color && role.color !== 0 ? `#${role.color.toString(16).padStart(6, '0')}` : undefined;
                    
                    console.log('🎨 Role rendering:', {
                      role,
                      roleName,
                      roleColor,
                      originalColor: role.color,
                      roleType: typeof role
                    });
                    
                    return (
                      <span 
                        key={index} 
                        className={styles.roleBadge}
                        style={roleColor ? {
                          backgroundColor: roleColor + '20',
                          color: roleColor,
                          border: `1px solid ${roleColor}40`
                        } : undefined}
                      >
                        {roleName}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

          {(memberInfo.DiscordId || memberInfo.discord_id) && (
            <div className={styles.field}>
              <span className={styles.label}>Discord ID</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={styles.value}>
                  {memberInfo.DiscordId || memberInfo.discord_id}
                </span>
                <button
                  onClick={() => copyToClipboard(memberInfo.DiscordId || memberInfo.discord_id || "")}
                  className={styles.copyButton}
                  title="Copy Discord ID"
                  style={{
                    background: 'none',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#666'
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* アドレス情報は下部に強調表示 */}
        <div className={styles.addressSection}>
          <span className={styles.addressLabel}>Wallet Address</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={styles.addressValue}>{address}</span>
            <button
              onClick={() => copyToClipboard(address)}
              className={styles.copyButton}
              title="Copy wallet address"
              style={{
                background: 'none',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#666'
              }}
            >
              Copy
            </button>
          </div>
        </div>

        {(memberInfo.joinedAt || memberInfo.joined_at) && (
          <div className={styles.field} style={{ marginTop: '1rem' }}>
            <span className={styles.label}>Joined At</span>
            <span className={styles.value}>
              {formatDate(memberInfo.joinedAt || memberInfo.joined_at)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
