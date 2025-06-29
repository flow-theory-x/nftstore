import React from "react";
import { Link } from "react-router-dom";
import { copyToClipboard } from "../utils/clipboardUtils";
import { AddressDisplayUtils } from "../utils/addressDisplayUtils";
import { AddressTypeIcon } from "./AddressTypeIcon";
import copyIcon from "../assets/icons/copy.svg";
import styles from "./AddressDisplay.module.css";

export interface AddressDisplayProps {
  address: string;
  displayName?: string;
  showIcon?: boolean;
  showCopyButton?: boolean;
  linkToOwnerPage?: boolean;
  linkToCreatorPage?: boolean;
  className?: string;
  iconSize?: "small" | "medium" | "large";
  copyButtonStyle?: "icon" | "text" | "minimal";
  maxLength?: "short" | "medium" | "full";
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  displayName,
  showIcon = false,
  showCopyButton = true,
  linkToOwnerPage = false,
  linkToCreatorPage = false,
  className = "",
  iconSize = "medium",
  copyButtonStyle = "icon",
  maxLength = "short"
}) => {
  if (!address || address.length !== 42) {
    return <span className={`${styles.invalidAddress} ${className}`}>Invalid Address</span>;
  }

  const formattedAddress = (() => {
    switch (maxLength) {
      case "full":
        return address;
      case "medium":
        return `${address.slice(0, 10)}...${address.slice(-8)}`;
      default:
        return AddressDisplayUtils.formatAddress(address);
    }
  })();

  const finalDisplayName = displayName || formattedAddress;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(address, { 
      showAlert: true,
      alertMessage: "Address copied!"
    });
  };

  const AddressContent = () => (
    <span className={`${styles.addressContent} ${className}`}>
      {showIcon && (
        <AddressTypeIcon address={address} size={iconSize} />
      )}
      <span className={styles.addressText} title={address}>
        {finalDisplayName}
      </span>
      {showCopyButton && (
        <button
          onClick={handleCopy}
          className={`${styles.copyButton} ${styles[`copyButton--${copyButtonStyle}`]}`}
          title="Copy address"
          type="button"
        >
          {copyButtonStyle === "icon" && (
            <img
              src={copyIcon}
              alt="Copy"
              width="16"
              height="16"
              className={styles.copyIcon}
            />
          )}
          {copyButtonStyle === "text" && "Copy"}
          {copyButtonStyle === "minimal" && "📋"}
        </button>
      )}
    </span>
  );

  if (linkToOwnerPage) {
    return (
      <Link 
        to={`/own/${address}`} 
        className={`${styles.addressLink} ${className}`}
        title={`View ${finalDisplayName}'s collection`}
      >
        <AddressContent />
      </Link>
    );
  }

  if (linkToCreatorPage) {
    return (
      <Link 
        to={`/creator/${address}`} 
        className={`${styles.addressLink} ${className}`}
        title={`View ${finalDisplayName}'s created tokens`}
      >
        <AddressContent />
      </Link>
    );
  }

  return <AddressContent />;
};

// より具体的な用途向けのコンポーネント
export const OwnerAddressDisplay: React.FC<Omit<AddressDisplayProps, 'linkToOwnerPage'>> = (props) => (
  <AddressDisplay {...props} linkToOwnerPage={true} showIcon={true} />
);

export const CreatorAddressDisplay: React.FC<Omit<AddressDisplayProps, 'linkToCreatorPage'>> = (props) => (
  <AddressDisplay {...props} linkToCreatorPage={true} showIcon={true} />
);

export const WalletAddressDisplay: React.FC<Omit<AddressDisplayProps, 'showIcon' | 'showCopyButton'>> = (props) => (
  <AddressDisplay {...props} showIcon={false} showCopyButton={true} copyButtonStyle="minimal" />
);