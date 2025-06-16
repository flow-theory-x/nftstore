// NFT対象コントラクトアドレス（TBAを作成・管理する通常のNFTコントラクト）
export const TBA_TARGET_NFT_CA_ADDRESSES = (import.meta.env.VITE_TBA_TARGET_NFT_CA || "0x0000000000000000000000000000000000000000")
  .split(',')
  .map(addr => addr.trim())
  .filter(addr => addr && addr !== "0x0000000000000000000000000000000000000000");

// 後方互換性のため、最初のアドレスをCONTRAC_ADDRESSとして使用
export const CONTRACT_ADDRESS = TBA_TARGET_NFT_CA_ADDRESSES[0] || "0x0000000000000000000000000000000000000000";
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID) || 1;
export const CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || "Ethereum";
export const RPC_URL =
  import.meta.env.VITE_RPC_URL || "https://eth.llamarpc.com";
export const CURRENCY_NAME = import.meta.env.VITE_CURRENCY_NAME || "Ethereum";
export const CURRENCY_SYMBOL = import.meta.env.VITE_CURRENCY_SYMBOL || "ETH";

// OpenSea URLs
export const OPENSEA_NETWORK =
  import.meta.env.VITE_OPENSEA_NETWORK || "ethereum";
export const OPENSEA_BASE_URL = `${
  import.meta.env.VITE_OPENSEA_BASE_URL || "https://opensea.io/assets"
}/${OPENSEA_NETWORK}`;

// Copyright information
export const COPYRIGHT_YEAR = import.meta.env.VITE_COPYRIGHT_YEAR || "2025";
export const COPYRIGHT_OWNER = import.meta.env.VITE_COPYRIGHT_OWNER || "FLOW";
export const COPYRIGHT_URL = import.meta.env.VITE_COPYRIGHT_URL || "";

// External link information
export const EXTERNAL_LINK_NAME = import.meta.env.VITE_EXTERNAL_LINK_NAME || "";
export const EXTERNAL_LINK_URL = import.meta.env.VITE_EXTERNAL_LINK_URL || "";

// Model viewer information
export const MODEL_VIEWER_BASE_URL = import.meta.env.VITE_MODEL_VIEWER_BASE_URL || "https://goodsun.github.io/modelviewer";

// TBA (Token Bound Account) configuration
export const TBA_REGISTRY_ADDRESS = import.meta.env.VITE_TBA_REGISTRY_ADDRESS || "0x000000006551c19487814612e58FE06813775758";
export const TBA_ACCOUNT_IMPLEMENTATION = import.meta.env.VITE_TBA_ACCOUNT_IMPLEMENTATION || "0x2D25602551487C3f3354dD80D76D54383A243358";

// SBT対象コントラクトアドレス（TBAが所有するSoulBound Tokenコントラクト）
export const TBA_TARGET_SBT_CA_ADDRESSES = (import.meta.env.VITE_TBA_TARGET_SBT_CA || "0x0000000000000000000000000000000000000000")
  .split(',')
  .map(addr => addr.trim())
  .filter(addr => addr && addr !== "0x0000000000000000000000000000000000000000");

// 後方互換性のため、最初のアドレスを単体変数として保持
export const TBA_TARGET_CONTRACT_ADDRESS = TBA_TARGET_NFT_CA_ADDRESSES[0] || "0x0000000000000000000000000000000000000000";
export const TBA_TARGET_CONTRACT_ADDRESSES = TBA_TARGET_NFT_CA_ADDRESSES;

// BURN済みトークンを示すdead address
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
