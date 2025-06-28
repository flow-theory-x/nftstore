import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CONTRACT_ADDRESS } from "../constants";
import { NftContractService } from "../utils/nftContract";
import { Spinner } from "../components/Spinner";
import { useAddressInfo } from "../hooks/useAddressInfo";
import { AddressDisplayUtils } from "../utils/addressDisplayUtils";
import copyIcon from "../assets/icons/copy.svg";
import discordIcon from "../assets/icons/discord.png";
import creatorIcon from "../assets/icons/creator.svg";
import styles from "./CollectionCreatorPage.module.css";

interface ContractInfo {
  contractAddress: string;
  contractName: string;
  creators: string[];
}

interface CreatorCardProps {
  creator: string;
  index: number;
}

const CreatorCard: React.FC<CreatorCardProps> = ({ creator, index }) => {
  const addressInfo = useAddressInfo(creator);
  
  const avatarUrl = AddressDisplayUtils.getAvatarUrlWithCreator(
    addressInfo.creatorName,
    addressInfo.memberInfo,
    addressInfo.tbaInfo?.tbaImage,
    creatorIcon
  );
  
  const isCreator = AddressDisplayUtils.isCreatorAccount(addressInfo.creatorName);
  const borderColor = isCreator ? "#FF6B35" : "#5865F2";
  const badgeText = isCreator ? "Creator" : "Discord";
  const badgeClass = isCreator ? styles.creatorBadge : styles.discordBadge;
  const discordId = addressInfo.memberInfo?.DiscordId || addressInfo.memberInfo?.discord_id;

  return (
    <Link 
      to={`/creator/${creator}`}
      className={styles.creatorCard}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className={styles.creatorHeader}>
        {avatarUrl ? (
          <div className={styles.avatarContainer}>
            <img
              src={avatarUrl}
              alt={`${addressInfo.displayName} avatar`}
              className={styles.avatar}
              style={{
                border: `3px solid ${borderColor}`
              }}
              onError={(e) => {
                if (addressInfo.memberInfo && e.currentTarget.src !== discordIcon) {
                  console.error('Failed to load avatar, using Discord icon');
                  e.currentTarget.src = discordIcon;
                }
              }}
            />
            <div className={badgeClass}>
              {badgeText}
            </div>
          </div>
        ) : (
          <div className={styles.defaultAvatar}>👤</div>
        )}

        <div className={styles.creatorInfo}>
          <h3 className={styles.creatorName}>
            {addressInfo.displayName || `Creator #${index + 1}`}
          </h3>

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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigator.clipboard.writeText(creator);
                }}
                className={styles.copyIcon}
                title="Copy address"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.creatorActions} style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%" }}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = `/creator/${creator}`;
          }}
          className={styles.actionButton}
        >
          View Creator
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = `/own/${creator}`;
          }}
          className={styles.actionButton}
        >
          View Collection
        </button>
        {discordId && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigator.clipboard.writeText(discordId);
            }}
            className={styles.discordButton}
            title={`Copy Discord ID: ${discordId}`}
          >
            Discord
          </button>
        )}
      </div>
    </Link>
  );
};

export const CollectionCreatorPage: React.FC = () => {
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);

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
          <span className={styles.statNumber}>{contractInfo.creators.length}</span>
          <span className={styles.statLabel}>Verified Creators</span>
        </div>
      </div>

      {contractInfo.creators.length > 0 ? (
        <div className={styles.creatorsGrid}>
          {contractInfo.creators.map((creator, index) => (
            <CreatorCard key={creator} creator={creator} index={index} />
          ))}
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
