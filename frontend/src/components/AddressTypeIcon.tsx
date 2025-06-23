import React, { useState, useEffect } from "react";
import { memberService } from "../utils/memberService";
import { TbaService } from "../utils/tbaService";
import { CONTRACT_ADDRESS } from "../constants";

interface AddressTypeIconProps {
  address: string;
  size?: "small" | "medium" | "large";
}

export const AddressTypeIcon: React.FC<AddressTypeIconProps> = ({ 
  address, 
  size = "medium" 
}) => {
  const [addressType, setAddressType] = useState<"loading" | "discord" | "tba" | "eoa">("loading");
  const [iconUrl, setIconUrl] = useState<string>("");
  const [tbaSourceNFT, setTbaSourceNFT] = useState<any>(null);

  const sizeStyles = {
    small: { width: "24px", height: "24px", fontSize: "16px" },
    medium: { width: "32px", height: "32px", fontSize: "20px" },
    large: { width: "40px", height: "40px", fontSize: "24px" }
  };

  useEffect(() => {
    const checkAddressType = async () => {
      if (!address || address.length !== 42) {
        setAddressType("eoa");
        return;
      }

      try {
        setAddressType("loading");

        // 1. Check if it's a TBA
        const tbaService = new TbaService();
        const isTBA = await tbaService.isTBAAccount(address);
        
        if (isTBA) {
          setAddressType("tba");
          
          // Get TBA source NFT icon
          try {
            const imageUrl = await tbaService.getTBASourceNFTImage(address);
            const nftName = await tbaService.getTBASourceNFTName(address);
            
            if (imageUrl) {
              setIconUrl(imageUrl);
            }
            
            // Store some basic info for tooltip
            setTbaSourceNFT({ name: nftName });
          } catch (error) {
            console.error("Error fetching TBA source NFT:", error);
          }
          
          return;
        }

        // 2. Check if it's a Discord user
        const memberInfo = await memberService.getMemberInfo(address);
        
        if (memberInfo) {
          setAddressType("discord");
          setIconUrl(memberInfo.Icon || memberInfo.avatar_url || "");
          return;
        }

        // 3. Default to EOA
        setAddressType("eoa");
      } catch (error) {
        console.error("Error checking address type:", error);
        setAddressType("eoa");
      }
    };

    checkAddressType();
  }, [address]);

  if (addressType === "loading") {
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

  if (addressType === "discord") {
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
        title="Discord User"
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

  if (addressType === "tba") {
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
        title={`Token Bound Account${tbaSourceNFT?.name ? ` (${tbaSourceNFT.name})` : ""}`}
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

  // EOA - no icon
  return null;
};