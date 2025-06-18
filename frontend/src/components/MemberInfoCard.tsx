import React, { useState, useEffect } from "react";
import type { MemberInfo, NFTToken } from "../types";
import { Spinner } from "./Spinner";
import { NFTCard } from "./NFTCard";
import { NftContractService } from "../utils/nftContract";
import styles from "./MemberInfoCard.module.css";

interface MemberInfoCardProps {
  memberInfo: MemberInfo | null;
  loading: boolean;
  address: string;
  isTbaAccount?: boolean;
  tbaSourceNFT?: NFTToken | null;
  tbaCheckLoading?: boolean;
}

export const MemberInfoCard: React.FC<MemberInfoCardProps> = ({
  memberInfo,
  loading,
  address,
  isTbaAccount = false,
  tbaSourceNFT = null,
  tbaCheckLoading = false,
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
            {tbaSourceNFT && (
              <>
                <div className={styles.field}>
                  <span className={styles.label}>Source NFT ID</span>
                  <span className={styles.value}>
                    {formatAddress(tbaSourceNFT.contractAddress)} #
                    {tbaSourceNFT.tokenId}
                  </span>
                </div>

                <div className={styles.field}>
                  <span className={styles.label}>Source Contract</span>
                  <span className={styles.value}>
                    {formatAddress(tbaSourceNFT.contractAddress)}
                  </span>
                </div>

                <div className={styles.field}>
                  <span className={styles.label}>NFT Owner</span>
                  <span className={styles.value}>
                    {formatAddress(tbaSourceNFT.owner)}
                  </span>
                </div>
              </>
            )}

            <div className={styles.field}>
              <span className={styles.label}>Account Type</span>
              <span className={styles.value}>
                Token Bound Account (ERC-6551)
              </span>
            </div>
          </div>

          {/* アドレス情報は下部に強調表示 */}
          <div className={styles.addressSection}>
            <span className={styles.addressLabel}>TBA Address</span>
            <span className={styles.addressValue}>{address}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.profileSection}>
          {(memberInfo.Icon || memberInfo.avatar_url) && (
            <div className={styles.avatarContainer}>
              <img
                src={memberInfo.Icon || memberInfo.avatar_url}
                alt={
                  memberInfo.Nick ||
                  memberInfo.Name ||
                  memberInfo.nickname ||
                  memberInfo.username ||
                  "Member"
                }
                className={styles.avatar}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <div className={styles.nameSection}>
            <h3 className={styles.displayName}>
              {memberInfo.Nick ||
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
          <div className={styles.field}>
            <span className={styles.label}>Member Status</span>
            <span className={styles.value}>
              {memberInfo.DeleteFlag || memberInfo.deleted
                ? "Deleted"
                : !(memberInfo.Expired || memberInfo.expires_at) ||
                  new Date(memberInfo.Expired || memberInfo.expires_at!) >
                    new Date()
                ? "Active"
                : "Expired"}
            </span>
          </div>

          {(memberInfo.DiscordId || memberInfo.discord_id) && (
            <div className={styles.field}>
              <span className={styles.label}>Discord ID</span>
              <span className={styles.value}>
                {memberInfo.DiscordId || memberInfo.discord_id}
              </span>
            </div>
          )}

          {(memberInfo.Roles || memberInfo.roles) &&
            Array.isArray(memberInfo.Roles || memberInfo.roles) &&
            (memberInfo.Roles || memberInfo.roles)!.length > 0 && (
              <div className={styles.field}>
                <span className={styles.label}>Roles</span>
                <div className={styles.rolesContainer}>
                  {(memberInfo.Roles || memberInfo.roles)!
                    .slice(0, 3)
                    .map((role: any, index: number) => (
                      <span key={index} className={styles.roleBadge}>
                        {typeof role === "object" ? role.name || role.id : role}
                      </span>
                    ))}
                  {(memberInfo.Roles || memberInfo.roles)!.length > 3 && (
                    <span className={styles.moreRoles}>
                      +{(memberInfo.Roles || memberInfo.roles)!.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

          {(memberInfo.Expired || memberInfo.expires_at) && (
            <div className={styles.field}>
              <span className={styles.label}>Valid Until</span>
              <span className={styles.value}>
                {formatDate(memberInfo.Expired || memberInfo.expires_at)}
              </span>
            </div>
          )}

          {(memberInfo.Updated || memberInfo.updated_at) && (
            <div className={styles.field}>
              <span className={styles.label}>Last Updated</span>
              <span className={styles.value}>
                {formatDate(memberInfo.Updated || memberInfo.updated_at)}
              </span>
            </div>
          )}
        </div>

        {/* アドレス情報は下部に強調表示 */}
        <div className={styles.addressSection}>
          <span className={styles.addressLabel}>Wallet Address</span>
          <span className={styles.addressValue}>{address}</span>
        </div>
      </div>
    </div>
  );
};
