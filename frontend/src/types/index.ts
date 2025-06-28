export interface NFTToken {
  id: string;
  tokenId?: string;
  owner?: string;
  tokenURI: string;
  contractAddress: string;
  isSbt?: boolean;
  name?: string;
  description?: string;
  image?: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
  };
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
}

export interface ContractInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: number;
  creator?: string;
  feeRate?: string;
  creatorOnly?: boolean;
}

export interface MemberInfo {
  address: string;
  // API response fields (uppercase keys)
  DeleteFlag?: boolean;
  DiscordId?: string;
  Icon?: string; // avatar URL
  Roles?: string[];
  Expired?: string;
  Eoa?: string;
  Nick?: string; // nickname
  PartitionName?: string;
  Updated?: string;
  Name?: string; // name
  Username?: string;
  
  // Legacy fields for backward compatibility
  name?: string;
  email?: string;
  role?: string;
  joinedAt?: string;
  status?: string;
  deleted?: boolean;
  discord_id?: string;
  avatar_url?: string;
  nickname?: string;
  username?: string;
  roles?: any[];
  expires_at?: string;
  updated_at?: string;
  
  [key: string]: any; // 追加のプロパティに対応
}

export interface TBAInfo {
  isTBA: boolean;
  sourceNFT?: NFTToken | null;
  tbaImage?: string | null;
  tbaName?: string | null;
}

export interface AddressNameInfo {
  address: string;
  creatorName?: string;
  memberInfo?: MemberInfo | null;
  tbaInfo?: TBAInfo;
  displayName: string;
  loading: boolean;
  error?: string | null;
}