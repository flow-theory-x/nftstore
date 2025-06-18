import React from "react";
import type { MemberInfo } from "../types";
import { Spinner } from "./Spinner";
import styles from "./MemberInfoCard.module.css";

interface MemberInfoCardProps {
  memberInfo: MemberInfo | null;
  loading: boolean;
  address: string;
}

export const MemberInfoCard: React.FC<MemberInfoCardProps> = ({
  memberInfo,
  loading,
  address,
}) => {
  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>Member Information</h3>
        </div>
        <div className={styles.loading}>
          <Spinner size="small" text="Loading member info..." />
        </div>
      </div>
    );
  }

  if (!memberInfo) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>Member Information</h3>
        </div>
        <div className={styles.notFound}>
          <p>This address is not registered as a member.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.profileSection}>
          {(memberInfo.Icon || memberInfo.avatar_url) && (
            <div className={styles.avatarContainer}>
              <img 
                src={memberInfo.Icon || memberInfo.avatar_url} 
                alt={memberInfo.Nick || memberInfo.Name || memberInfo.nickname || memberInfo.username || "Member"} 
                className={styles.avatar}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <div className={styles.nameSection}>
            <h3 className={styles.displayName}>
              {memberInfo.Nick || memberInfo.Name || memberInfo.nickname || memberInfo.username || "Unknown Member"}
            </h3>
            {(memberInfo.Username || memberInfo.username) && 
             (memberInfo.Nick || memberInfo.Name) && 
             (memberInfo.Nick || memberInfo.Name) !== (memberInfo.Username || memberInfo.username) && (
              <p className={styles.username}>@{memberInfo.Username || memberInfo.username}</p>
            )}
          </div>
        </div>
        <div className={styles.status}>
          <span 
            className={`${styles.statusBadge} ${
              !(memberInfo.DeleteFlag || memberInfo.deleted) && 
              (!(memberInfo.Expired || memberInfo.expires_at) || new Date(memberInfo.Expired || memberInfo.expires_at!) > new Date())
                ? styles.statusActive 
                : styles.statusInactive
            }`}
          >
            {(memberInfo.DeleteFlag || memberInfo.deleted)
              ? 'Deleted' 
              : (!(memberInfo.Expired || memberInfo.expires_at) || new Date(memberInfo.Expired || memberInfo.expires_at!) > new Date())
                ? 'Active'
                : 'Expired'
            }
          </span>
        </div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.infoGrid}>
          {(memberInfo.DiscordId || memberInfo.discord_id) && (
            <div className={styles.field}>
              <span className={styles.label}>Discord ID</span>
              <span className={styles.value}>{memberInfo.DiscordId || memberInfo.discord_id}</span>
            </div>
          )}
          
          {(memberInfo.Roles || memberInfo.roles) && Array.isArray(memberInfo.Roles || memberInfo.roles) && (memberInfo.Roles || memberInfo.roles)!.length > 0 && (
            <div className={styles.field}>
              <span className={styles.label}>Roles</span>
              <div className={styles.rolesContainer}>
                {(memberInfo.Roles || memberInfo.roles)!.slice(0, 3).map((role: any, index: number) => (
                  <span key={index} className={styles.roleBadge}>
                    {typeof role === 'object' ? role.name || role.id : role}
                  </span>
                ))}
                {(memberInfo.Roles || memberInfo.roles)!.length > 3 && (
                  <span className={styles.moreRoles}>+{(memberInfo.Roles || memberInfo.roles)!.length - 3} more</span>
                )}
              </div>
            </div>
          )}
          
          {(memberInfo.Expired || memberInfo.expires_at) && (
            <div className={styles.field}>
              <span className={styles.label}>Valid Until</span>
              <span className={styles.value}>{formatDate(memberInfo.Expired || memberInfo.expires_at)}</span>
            </div>
          )}
          
          {(memberInfo.Updated || memberInfo.updated_at) && (
            <div className={styles.field}>
              <span className={styles.label}>Last Updated</span>
              <span className={styles.value}>{formatDate(memberInfo.Updated || memberInfo.updated_at)}</span>
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