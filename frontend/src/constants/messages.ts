/**
 * アプリケーション全体で使用するメッセージ定数
 */

// ローディングメッセージ
export const LOADING_MESSAGES = {
  DEFAULT: "Loading...",
  TOKENS: "Loading tokens...",
  CONTRACT_INFO: "Loading contract information...",
  CREATOR_INFO: "Loading creator information...",
  MEMBER_INFO: "Loading member info...",
  METADATA: "Loading metadata...",
  TBA_INFO: "Checking account type...",
  BATCH_TOKENS: "Loading next batch...",
  PREPARING: "Preparing to load tokens...",
} as const;

// エラーメッセージ
export const ERROR_MESSAGES = {
  GENERIC: "An unexpected error occurred",
  NETWORK: "Network connection failed",
  CONTRACT: "Contract operation failed",
  TOKEN_NOT_FOUND: "Token not found",
  CREATOR_NOT_FOUND: "Creator not found",
  INVALID_ADDRESS: "Invalid address provided",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
  TRANSACTION_FAILED: "Transaction failed",
  METADATA_LOAD_FAILED: "Failed to load metadata",
  WALLET_CONNECTION_FAILED: "Failed to connect wallet",
} as const;

// 成功メッセージ
export const SUCCESS_MESSAGES = {
  COPIED: "Copied!",
  ADDRESS_COPIED: "Address copied!",
  ERROR_COPIED: "Error details copied!",
  TRANSACTION_SUCCESS: "Transaction successful!",
  MINT_SUCCESS: "NFT minted successfully!",
  BURN_SUCCESS: "NFT burned successfully!",
  TRANSFER_SUCCESS: "NFT transferred successfully!",
} as const;

// 確認メッセージ
export const CONFIRMATION_MESSAGES = {
  BURN_TOKEN: "Are you sure you want to burn this token? This action cannot be undone.",
  TRANSFER_TOKEN: "Are you sure you want to transfer this token?",
  DISCONNECT_WALLET: "Are you sure you want to disconnect your wallet?",
} as const;

// 情報メッセージ
export const INFO_MESSAGES = {
  NO_TOKENS: "No tokens found",
  NO_CREATORS: "No creators found",
  EMPTY_COLLECTION: "This collection doesn't have any tokens yet",
  NOT_CONNECTED: "Please connect your wallet",
  WRONG_NETWORK: "Please switch to the correct network",
  TBA_NOT_DEPLOYED: "Token Bound Account not deployed yet",
} as const;

// プレースホルダーメッセージ
export const PLACEHOLDER_MESSAGES = {
  SEARCH: "Search tokens...",
  RECIPIENT_ADDRESS: "Enter recipient address",
  TOKEN_NAME: "Enter token name",
  TOKEN_DESCRIPTION: "Enter token description",
} as const;