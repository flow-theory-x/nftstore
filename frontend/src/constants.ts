// NFT対象コントラクトアドレス
export const CONTRACT_ADDRESS = import.meta.env.VITE_TARGET_NFT_CA || "0x0000000000000000000000000000000000000000";
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

// Site information
export const SITE_TITLE = import.meta.env.VITE_SITE_TITLE || "NFT Mint Store";

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
export const TBA_DEFAULT_SALT = import.meta.env.VITE_TBA_DEFAULT_SALT || "0";

// TBA対象コントラクトアドレス
export const TBA_TARGET_CONTRACT_ADDRESS = CONTRACT_ADDRESS;

// BURN済みトークンを示すdead address
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

// TBA機能が有効かどうかをチェック
export const isTBAEnabled = (): boolean => {
  return CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
};

// 指定されたコントラクトアドレスがTBA対象かどうかをチェック
export const isTBATargetContract = (contractAddress: string): boolean => {
  return contractAddress.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
};

// CA Casher (キャッシュサーバー) 設定
// 明示的に無効にしない限り有効（開発環境ではプロキシ経由で使用）
export const CA_CASHER_ENABLED = import.meta.env.VITE_CA_CASHER_ENABLED !== 'false';
export const CA_CASHER_BASE_URL = import.meta.env.VITE_CA_CASHER_BASE_URL || 'https://ea7lit5re3.execute-api.ap-northeast-1.amazonaws.com/prod';

// CA Casherが有効かどうかをチェック
export const isCACasherEnabled = (): boolean => {
  return CA_CASHER_ENABLED;
};

// Member API 設定
export const MEMBER_API_BASE_URL = import.meta.env.VITE_MEMBER_API_BASE_URL || 'https://ehfm6q914a.execute-api.ap-northeast-1.amazonaws.com/member';

