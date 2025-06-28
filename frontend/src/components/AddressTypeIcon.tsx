import React from "react";
import { useAddressInfo } from "../hooks/useAddressInfo";
import { AddressDisplayUtils } from "../utils/addressDisplayUtils";
import creatorIcon from "../assets/icons/creator.svg";

interface AddressTypeIconProps {
  address: string;
  size?: "small" | "medium" | "large";
}

export const AddressTypeIcon: React.FC<AddressTypeIconProps> = ({ 
  address, 
  size = "medium" 
}) => {
  const addressInfo = useAddressInfo(address);

  const sizeStyles = {
    small: { width: "24px", height: "24px", fontSize: "16px" },
    medium: { width: "32px", height: "32px", fontSize: "20px" },
    large: { width: "40px", height: "40px", fontSize: "24px" }
  };

  if (!address || address.length !== 42) {
    return null;
  }

  if (addressInfo.loading) {
    return (
      <span 
        style={{
          ...sizeStyles[size],
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f0f0f0",
          borderRadius: "50%",
          marginLeft: "8px"
        }}
      >
        ⏳
      </span>
    );
  }

  if (addressInfo.memberInfo) {
    const iconUrl = AddressDisplayUtils.getAvatarUrl(addressInfo.memberInfo);
    
    return (
      <span 
        style={{
          ...sizeStyles[size],
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "8px",
          borderRadius: "50%",
          overflow: "hidden",
          backgroundColor: "#5865F2"
        }}
        title={AddressDisplayUtils.isCreatorAccount(addressInfo.creatorName) 
          ? "Creator (Discord Member)" 
          : "Discord User"}
      >
        {iconUrl ? (
          <img 
            src={iconUrl} 
            alt="Discord User" 
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "cover" 
            }} 
          />
        ) : (
          <span style={{ color: "white", fontSize: sizeStyles[size].fontSize }}>
            👤
          </span>
        )}
      </span>
    );
  }

  if (addressInfo.tbaInfo?.isTBA) {
    const iconUrl = addressInfo.tbaInfo.tbaImage;
    
    return (
      <span 
        style={{
          ...sizeStyles[size],
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: iconUrl ? "transparent" : "#FF6B35",
          borderRadius: "50%",
          marginLeft: "8px",
          color: "white",
          overflow: "hidden",
          border: iconUrl ? "2px solid #FF6B35" : "none"
        }}
        title={`Token Bound Account${addressInfo.tbaInfo.tbaName ? ` (${addressInfo.tbaInfo.tbaName})` : ""}`}
      >
        {iconUrl ? (
          <img 
            src={iconUrl} 
            alt="TBA Source NFT" 
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "cover" 
            }} 
          />
        ) : (
          <span style={{ fontSize: sizeStyles[size].fontSize }}>
            🎒
          </span>
        )}
      </span>
    );
  }

  // Creator account without Discord info
  if (AddressDisplayUtils.isCreatorAccount(addressInfo.creatorName)) {
    return (
      <span 
        style={{
          ...sizeStyles[size],
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "8px",
          borderRadius: "50%",
          overflow: "hidden",
          backgroundColor: "#FF6B35"
        }}
        title="Creator Account"
      >
        <img 
          src={creatorIcon} 
          alt="Creator" 
          style={{ 
            width: "100%", 
            height: "100%", 
            objectFit: "cover" 
          }} 
        />
      </span>
    );
  }

  // EOA - no icon
  return null;
};