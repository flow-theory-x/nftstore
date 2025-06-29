import React, { useState } from "react";
import { AddressDisplayUtils } from "../utils/addressDisplayUtils";
import { useAddressInfo } from "../hooks/useAddressInfo";
import type { MemberInfo, TBAInfo } from "../types";
import creatorIcon from "../assets/icons/creator.svg";
import discordIcon from "../assets/icons/discord.png";
import styles from "./UserAvatar.module.css";

export interface UserAvatarProps {
  address: string;
  size?: "small" | "medium" | "large" | "xlarge";
  showBadge?: boolean;
  showTooltip?: boolean;
  className?: string;
  // 手動でデータを渡す場合（useAddressInfoを使わない場合）
  memberInfo?: MemberInfo | null;
  creatorName?: string;
  tbaInfo?: TBAInfo;
  customAvatarUrl?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  address,
  size = "medium",
  showBadge = true,
  showTooltip = true,
  className = "",
  memberInfo: propMemberInfo,
  creatorName: propCreatorName,
  tbaInfo: propTbaInfo,
  customAvatarUrl
}) => {
  // propsで渡されない場合のみuseAddressInfoを使用
  const addressInfoHook = useAddressInfo(
    (!propMemberInfo && !propCreatorName && !propTbaInfo) ? address : null
  );

  const [imageError, setImageError] = useState(false);

  // propsが渡されている場合はそれを使用、そうでなければhookの結果を使用
  const memberInfo = propMemberInfo ?? addressInfoHook.memberInfo;
  const creatorName = propCreatorName ?? addressInfoHook.creatorName;
  const tbaInfo = propTbaInfo ?? addressInfoHook.tbaInfo;

  const isCreator = AddressDisplayUtils.isCreatorAccount(creatorName);
  const hasDiscord = !!memberInfo;
  const isTBA = tbaInfo?.isTBA;

  // アバターURLの決定
  const avatarUrl = customAvatarUrl || AddressDisplayUtils.getAvatarUrlWithCreator(
    creatorName,
    memberInfo,
    tbaInfo?.tbaImage,
    creatorIcon
  );

  // フォールバックアイコンの決定
  const getFallbackIcon = () => {
    if (isTBA) return "🎒";
    if (isCreator) return creatorIcon;
    if (hasDiscord) return discordIcon;
    return "👤";
  };

  // ボーダー色の決定
  const getBorderColor = () => {
    if (isTBA) return "#FF6B35";
    if (isCreator) return "#FF6B35";
    if (hasDiscord) return "#5865F2";
    return "#ccc";
  };

  // バッジテキストの決定
  const getBadgeText = () => {
    if (isTBA) return "TBA";
    if (isCreator) return "Creator";
    if (hasDiscord) return "Discord";
    return null;
  };

  // ツールチップテキストの決定
  const getTooltipText = () => {
    if (isTBA && tbaInfo?.tbaName) return `Token Bound Account (${tbaInfo.tbaName})`;
    if (isTBA) return "Token Bound Account";
    if (isCreator && hasDiscord) return "Creator (Discord Member)";
    if (isCreator) return "Creator Account";
    if (hasDiscord) return "Discord User";
    return "Externally Owned Account";
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const displayName = AddressDisplayUtils.getDisplayNameFromParts(
    creatorName,
    memberInfo,
    tbaInfo,
    address
  );

  const sizeClass = `avatar--${size}`;
  const borderColor = getBorderColor();
  const badgeText = getBadgeText();
  const tooltipText = getTooltipText();

  return (
    <div 
      className={`${styles.avatarContainer} ${styles[sizeClass]} ${className}`}
      title={showTooltip ? tooltipText : undefined}
    >
      <div 
        className={styles.avatarWrapper}
        style={{ borderColor }}
      >
        {avatarUrl && !imageError ? (
          <img
            src={avatarUrl}
            alt={`${displayName} avatar`}
            className={styles.avatarImage}
            onError={handleImageError}
          />
        ) : (
          <div className={styles.avatarFallback}>
            {typeof getFallbackIcon() === 'string' && getFallbackIcon() !== creatorIcon && getFallbackIcon() !== discordIcon ? (
              <span className={styles.avatarEmoji}>
                {getFallbackIcon()}
              </span>
            ) : (
              <img
                src={getFallbackIcon() as string}
                alt={`${displayName} avatar`}
                className={styles.avatarImage}
              />
            )}
          </div>
        )}
      </div>
      
      {showBadge && badgeText && (
        <div className={`${styles.badge} ${styles[`badge--${badgeText.toLowerCase()}`]}`}>
          {badgeText}
        </div>
      )}
    </div>
  );
};

// 特定用途向けのコンポーネント
export const CreatorAvatar: React.FC<Omit<UserAvatarProps, 'showBadge'>> = (props) => (
  <UserAvatar {...props} showBadge={true} />
);

export const MemberAvatar: React.FC<Omit<UserAvatarProps, 'showBadge'>> = (props) => (
  <UserAvatar {...props} showBadge={true} />
);

export const SimpleAvatar: React.FC<Omit<UserAvatarProps, 'showBadge' | 'showTooltip'>> = (props) => (
  <UserAvatar {...props} showBadge={false} showTooltip={false} />
);