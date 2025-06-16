export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";
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
