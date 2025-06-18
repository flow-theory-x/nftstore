export interface NFTToken {
  tokenId: string;
  owner: string;
  tokenURI: string;
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
  creator: string;
  feeRate: string;
  creatorOnly: boolean;
}

export interface MemberInfo {
  address: string;
  Nick?: string;
  Name?: string;
  Username?: string;
  nickname?: string;
  username?: string;
  Icon?: string;
  avatar_url?: string;
  [key: string]: any;
}