import { ethers } from "ethers";
import { CONTRACT_ADDRESS, RPC_URL } from "../constants";
import type { NFTToken, ContractInfo } from "../types";
import contractAbi from "../../config/donaterble_nft_abi.json";
import { withCACasher } from "./caCasherClient";

/**
 * NFT Contract Service
 * Handles all interactions with the NFT smart contract
 */
export class NftContractService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private contractAddress: string;

  constructor(contractAddress?: string, signer?: ethers.JsonRpcSigner) {
    this.contractAddress = contractAddress || CONTRACT_ADDRESS;
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.contract = new ethers.Contract(
      this.contractAddress,
      contractAbi,
      signer || this.provider
    );
  }

  // === BASIC CONTRACT INFO ===

  async getName(): Promise<string> {
    try {
      return await withCACasher(
        this.contractAddress,
        'name',
        [],
        async () => await (this.contract as any).name()
      );
    } catch (error) {
      console.error("Failed to get contract name:", error);
      throw error;
    }
  }

  async getSymbol(): Promise<string> {
    try {
      return await withCACasher(
        this.contractAddress,
        'symbol',
        [],
        async () => await (this.contract as any).symbol()
      );
    } catch (error) {
      console.error("Failed to get contract symbol:", error);
      throw error;
    }
  }

  async getTotalSupply(): Promise<number> {
    try {
      const supply = await withCACasher(
        this.contractAddress,
        'totalSupply',
        [],
        async () => await (this.contract as any).totalSupply()
      );
      return Number(supply);
    } catch (error) {
      console.error("Failed to get total supply:", error);
      throw error;
    }
  }

  async getContractInfo(): Promise<ContractInfo> {
    try {
      const [name, symbol, totalSupply] = await Promise.all([
        this.getName(),
        this.getSymbol(),
        this.getTotalSupply()
      ]);

      return {
        address: this.contractAddress,
        name,
        symbol,
        totalSupply
      };
    } catch (error) {
      console.error("Failed to get contract info:", error);
      throw error;
    }
  }

  // === TOKEN OPERATIONS ===

  async getTokenInfo(tokenId: string): Promise<NFTToken> {
    try {
      const [tokenURI, owner] = await Promise.all([
        (this.contract as any).tokenURI(tokenId),
        this.getTokenOwner(tokenId)
      ]);
      
      if (!tokenURI) {
        throw new Error('Token URI is empty');
      }

      const metadata = await this.fetchMetadata(tokenURI);

      return {
        id: tokenId,
        tokenId: tokenId,
        owner,
        contractAddress: this.contractAddress,
        tokenURI,
        ...metadata
      };
    } catch (error) {
      console.error(`Failed to get token info for token ${tokenId}:`, error);
      throw error;
    }
  }

  async getTokenOwner(tokenId: string): Promise<string> {
    try {
      const owner = await withCACasher(
        this.contractAddress,
        'ownerOf',
        [tokenId],
        async () => await (this.contract as any).ownerOf(tokenId)
      );
      return owner.toLowerCase();
    } catch (error) {
      console.error(`Failed to get owner for token ${tokenId}:`, error);
      throw error;
    }
  }

  async getTokenURI(tokenId: string): Promise<string> {
    try {
      return await withCACasher(
        this.contractAddress,
        'tokenURI',
        [tokenId],
        async () => await (this.contract as any).tokenURI(tokenId)
      );
    } catch (error) {
      console.error(`Failed to get token URI for ${tokenId}:`, error);
      throw error;
    }
  }

  // === TOKEN DISCOVERY ===

  async getAllTokenIds(): Promise<string[]> {
    try {
      const totalSupply = await this.getTotalSupply();
      
      if (totalSupply === 0) {
        return [];
      }

      const tokenIds: string[] = [];
      for (let i = 0; i < totalSupply; i++) {
        try {
          const tokenId = await withCACasher(
            this.contractAddress,
            'tokenByIndex',
            [i.toString()],
            async () => await (this.contract as any).tokenByIndex(i)
          );
          tokenIds.push(tokenId.toString());
        } catch (indexError) {
          console.warn(`Failed to get token at index ${i}:`, indexError);
        }
      }
      
      return tokenIds;
    } catch (error) {
      console.error("Failed to get all token IDs:", error);
      throw error;
    }
  }

  async getTokensByOwner(owner: string): Promise<string[]> {
    try {
      const balance = await this.getBalanceOf(owner);
      const balanceNum = parseInt(balance);
      
      if (balanceNum === 0) {
        return [];
      }

      const tokenIds: string[] = [];
      for (let i = 0; i < balanceNum; i++) {
        try {
          const tokenId = await withCACasher(
            this.contractAddress,
            'tokenOfOwnerByIndex',
            [owner, i.toString()],
            async () => await (this.contract as any).tokenOfOwnerByIndex(owner, i)
          );
          tokenIds.push(tokenId.toString());
        } catch (error) {
          console.warn(`Failed to get token at index ${i} for owner ${owner}:`, error);
        }
      }
      
      return tokenIds;
    } catch (error) {
      console.error(`Failed to get tokens for owner ${owner}:`, error);
      throw error;
    }
  }

  async getTokensWithMetadata(tokenIds: string[]): Promise<NFTToken[]> {
    const tokens: NFTToken[] = [];
    
    for (const tokenId of tokenIds) {
      try {
        const tokenInfo = await this.getTokenInfo(tokenId);
        tokens.push(tokenInfo);
      } catch (error) {
        console.warn(`Failed to get metadata for token ${tokenId}:`, error);
      }
    }
    
    return tokens;
  }

  // === CREATOR OPERATIONS ===

  async getCreators(): Promise<string[]> {
    try {
      const creators = await withCACasher(
        this.contractAddress,
        'getCreators',
        [],
        async () => await (this.contract as any).getCreators()
      );
      return creators || [];
    } catch (error) {
      console.warn("Contract getCreators() failed, trying fallback methods:", error);
      try {
        const owner = await this.getOwner();
        return owner ? [owner] : [];
      } catch (ownerError) {
        console.error("Failed to get creators:", ownerError);
        return [];
      }
    }
  }

  async getCreatorName(creator: string): Promise<string> {
    try {
      return await withCACasher(
        this.contractAddress,
        'getCreatorName',
        [creator],
        async () => await (this.contract as any).getCreatorName(creator)
      );
    } catch (error) {
      console.error("Failed to get creator name:", error);
      throw error;
    }
  }

  async getTokenCreator(tokenId: string): Promise<string> {
    try {
      const creator = await withCACasher(
        this.contractAddress,
        'getTokenCreator',
        [tokenId],
        async () => await (this.contract as any).getTokenCreator(tokenId)
      );
      return creator || "";
    } catch (error) {
      console.warn(`Contract getTokenCreator(${tokenId}) failed, trying fallback:`, error);
      try {
        const owner = await this.getOwner();
        return owner || "";
      } catch (ownerError) {
        console.error("Failed to get token creator:", ownerError);
        return "";
      }
    }
  }

  async getCreatorTokens(creator: string): Promise<string[]> {
    try {
      const creatorTokenIds = await (this.contract as any).getCreatorTokens(creator);
      return creatorTokenIds.map((id: any) => id.toString());
    } catch (error) {
      console.warn(`Contract getCreatorTokens(${creator}) failed, using fallback method:`, error);
      // Fallback: get all tokens and filter by creator
      const allTokenIds = await this.getAllTokenIds();
      const creatorTokenIds: string[] = [];
      
      for (const tokenId of allTokenIds) {
        try {
          const tokenCreator = await this.getTokenCreator(tokenId);
          if (tokenCreator.toLowerCase() === creator.toLowerCase()) {
            creatorTokenIds.push(tokenId);
          }
        } catch (tokenError) {
          console.warn(`Failed to check creator for token ${tokenId}:`, tokenError);
        }
      }
      
      return creatorTokenIds;
    }
  }

  // === OWNERSHIP & PERMISSIONS ===

  async getOwner(): Promise<string> {
    try {
      // Try different owner function names
      const ownerMethods = ['owner', '_owner', 'getOwner'];
      
      for (const method of ownerMethods) {
        try {
          const ownerAddress = await (this.contract as any)[method]();
          return ownerAddress;
        } catch {
          continue;
        }
      }
      
      console.warn("No owner function found in contract");
      return "";
    } catch (error) {
      console.error("Failed to get contract owner:", error);
      throw error;
    }
  }

  async getBalanceOf(owner: string): Promise<string> {
    try {
      const balance = await withCACasher(
        this.contractAddress,
        'balanceOf',
        [owner],
        async () => await (this.contract as any).balanceOf(owner)
      );
      return balance.toString();
    } catch (error) {
      console.error(`Failed to get balance for ${owner}:`, error);
      throw error;
    }
  }

  // === MINTING ===

  async getMintFee(): Promise<string> {
    try {
      const fee = await (this.contract as any)._mintFee();
      return ethers.formatEther(fee);
    } catch (error) {
      console.error("Failed to get mint fee:", error);
      throw error;
    }
  }

  async mint(
    to: string,
    metaUrl: string,
    signer: ethers.JsonRpcSigner,
    customFee?: string,
    feeRate: number = 0,
    sbtFlag: boolean = false
  ): Promise<ethers.ContractTransactionResponse> {
    let mintFee: string = '';
    
    try {
      const contractWithSigner = this.contract.connect(signer);
      mintFee = customFee || await this.getMintFee();

      const tx = await (contractWithSigner as any).mint(to, metaUrl, feeRate, sbtFlag, {
        value: ethers.parseEther(mintFee),
      });

      return tx;
    } catch (error: any) {
      console.error("Failed to mint NFT:", error);
      
      // missing revert data エラー（estimateGas失敗）の判定
      if (error.code === 'CALL_EXCEPTION' && error.action === 'estimateGas') {
        // トランザクションの詳細を確認
        const from = error.transaction?.from;
        const value = error.transaction?.value || '0';
        
        // ウォレット残高を確認
        try {
          const balance = await signer.provider?.getBalance(from);
          const feeAmount = mintFee || customFee || await this.getMintFee();
          const requiredAmount = ethers.parseEther(feeAmount);
          
          if (balance && balance < requiredAmount) {
            const balanceInEther = ethers.formatEther(balance);
            const requiredInEther = ethers.formatEther(requiredAmount);
            throw new Error(`ウォレット残高が不足しています。\n必要額: ${requiredInEther} ETH\n現在の残高: ${balanceInEther} ETH`);
          }
        } catch (balanceError) {
          console.error('Balance check failed:', balanceError);
        }
        
        throw new Error('ガス代の見積もりに失敗しました。ウォレットの残高とネットワーク接続を確認してください。');
      }
      
      // ガス不足エラーの判定
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT' || 
          error.message?.includes('cannot estimate gas') ||
          error.message?.includes('gas required exceeds') ||
          error.message?.includes('insufficient funds for gas') ||
          error.error?.message?.includes('gas')) {
        throw new Error('ガス代が不足しています。ウォレットの残高を確認してください。');
      }
      
      // その他のエラーメッセージを日本語化
      if (error.message?.includes('user rejected')) {
        throw new Error('トランザクションがキャンセルされました。');
      }
      
      if (error.message?.includes('network')) {
        throw new Error('ネットワークエラーが発生しました。接続を確認してください。');
      }
      
      // デフォルトのエラーメッセージ
      throw new Error(error.message || 'ミントに失敗しました。');
    }
  }

  // === TRANSFERS ===

  async transferFrom(
    from: string,
    to: string,
    tokenId: string,
    signer: ethers.JsonRpcSigner
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const contractWithSigner = this.contract.connect(signer);
      const tx = await (contractWithSigner as any).transferFrom(from, to, tokenId);
      return tx;
    } catch (error) {
      console.error("Failed to transfer NFT:", error);
      throw error;
    }
  }

  async transfer(
    to: string,
    tokenId: string,
    signer: ethers.JsonRpcSigner
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const from = await signer.getAddress();
      return await this.transferFrom(from, to, tokenId, signer);
    } catch (error) {
      console.error("Failed to transfer token:", error);
      throw error;
    }
  }

  // === APPROVALS ===

  async approve(
    to: string,
    tokenId: string,
    signer: ethers.JsonRpcSigner
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const contractWithSigner = this.contract.connect(signer);
      const tx = await (contractWithSigner as any).approve(to, tokenId);
      return tx;
    } catch (error) {
      console.error("Failed to approve NFT:", error);
      throw error;
    }
  }

  async getApproved(tokenId: string): Promise<string> {
    try {
      const approved = await (this.contract as any).getApproved(tokenId);
      return approved;
    } catch (error) {
      console.error(`Failed to get approved address for token ${tokenId}:`, error);
      throw error;
    }
  }

  async setApprovalForAll(
    operator: string,
    approved: boolean,
    signer: ethers.JsonRpcSigner
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const contractWithSigner = this.contract.connect(signer);
      const tx = await (contractWithSigner as any).setApprovalForAll(operator, approved);
      return tx;
    } catch (error) {
      console.error("Failed to set approval for all:", error);
      throw error;
    }
  }

  async isApprovedForAll(owner: string, operator: string): Promise<boolean> {
    try {
      const isApproved = await (this.contract as any).isApprovedForAll(owner, operator);
      return isApproved;
    } catch (error) {
      console.error(`Failed to check approval for all (${owner} -> ${operator}):`, error);
      throw error;
    }
  }

  // === BURNING ===

  async burn(tokenId: string, signer: ethers.JsonRpcSigner): Promise<ethers.ContractTransactionResponse> {
    try {
      const contractWithSigner = this.contract.connect(signer);
      const tx = await (contractWithSigner as any).burn(tokenId);
      return tx;
    } catch (error) {
      console.error("Failed to burn NFT:", error);
      throw error;
    }
  }

  // === UTILITY METHODS ===

  async fetchMetadata(tokenURI: string): Promise<any> {
    try {
      if (tokenURI.startsWith('http://') || tokenURI.startsWith('https://')) {
        const response = await fetch(tokenURI);
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.status}`);
        }
        return await response.json();
      } else if (tokenURI.startsWith('data:application/json;base64,')) {
        const base64Data = tokenURI.replace('data:application/json;base64,', '');
        const jsonString = atob(base64Data);
        return JSON.parse(jsonString);
      } else {
        throw new Error('Unsupported tokenURI format');
      }
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
      throw error;
    }
  }

  async exists(tokenId: string): Promise<boolean> {
    try {
      await (this.contract as any).ownerOf(tokenId);
      return true;
    } catch (error) {
      return false;
    }
  }

  async supportsInterface(interfaceId: string): Promise<boolean> {
    try {
      const supports = await (this.contract as any).supportsInterface(interfaceId);
      return supports;
    } catch (error) {
      console.error(`Failed to check interface support for ${interfaceId}:`, error);
      return false;
    }
  }

  // === BATCH OPERATIONS (for legacy compatibility) ===

  async getTokensBatchWithProgress(
    startIndex: number,
    batchSize: number,
    totalSupply?: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<any[] & { hasMore: boolean }> {
    try {
      const total = totalSupply || await this.getTotalSupply();
      const tokens: any[] = [];
      const endIndex = Math.min(startIndex + batchSize, total);
      
      for (let i = startIndex; i < endIndex; i++) {
        try {
          const tokenId = await (this.contract as any).tokenByIndex(i);
          const owner = await this.getTokenOwner(tokenId.toString());
          const tokenURI = await this.getTokenURI(tokenId.toString());
          
          tokens.push({
            id: tokenId.toString(),
            tokenId: tokenId.toString(),
            owner: owner,
            tokenURI: tokenURI,
            contractAddress: this.contractAddress
          });

          if (onProgress) {
            onProgress(i - startIndex + 1, batchSize);
          }
        } catch (indexError) {
          console.warn(`Failed to get token at index ${i}:`, indexError);
        }
      }
      
      const hasMore = startIndex + batchSize < total;
      return Object.assign(tokens, { hasMore });
    } catch (error) {
      console.error("Failed to get tokens batch with progress:", error);
      return Object.assign([], { hasMore: false });
    }
  }

  async getCreatorTokensBatchWithProgress(
    creator: string,
    startIndex: number,
    batchSize: number,
    totalSupply?: number,
    onProgress?: (current: number, total: number) => void,
    contractAddress?: string
  ): Promise<NFTToken[] & { hasMore: boolean }> {
    try {
      const creatorTokenIds = await this.getCreatorTokens(creator);
      const creatorTokens: NFTToken[] = [];
      const endIndex = Math.min(startIndex + batchSize, creatorTokenIds.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        try {
          const tokenInfo = await this.getTokenInfo(creatorTokenIds[i]);
          creatorTokens.push(tokenInfo);
          
          if (onProgress) {
            onProgress(i - startIndex + 1, batchSize);
          }
        } catch (error) {
          console.warn(`Failed to get info for token ${creatorTokenIds[i]}:`, error);
        }
      }
      
      const hasMore = startIndex + batchSize < creatorTokenIds.length;
      return Object.assign(creatorTokens, { hasMore });
    } catch (error) {
      console.error("Failed to get creator tokens batch with progress:", error);
      return Object.assign([], { hasMore: false });
    }
  }

  async getTokensByOwnerWithProgress(
    owner: string,
    onProgress?: (message: string, tokenId?: string) => void,
    onTokenReady?: (token: NFTToken) => void
  ): Promise<void> {
    try {
      if (onProgress) {
        onProgress("Getting owned token IDs...");
      }
      
      const tokenIds = await this.getTokensByOwner(owner);
      
      if (onProgress) {
        onProgress(`Found ${tokenIds.length} tokens, loading details...`);
      }

      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i];
        try {
          if (onProgress) {
            onProgress("Loading metadata...", tokenId);
          }
          
          const tokenInfo = await this.getTokenInfo(tokenId);
          
          if (onTokenReady) {
            onTokenReady(tokenInfo);
          }
          
          if (onProgress) {
            onProgress(`Loaded ${i + 1}/${tokenIds.length} tokens`);
          }
        } catch (error) {
          console.warn(`Failed to load token ${tokenId}:`, error);
          if (onProgress) {
            onProgress(`Failed to load token ${tokenId}`, tokenId);
          }
        }
      }
      
      if (onProgress) {
        onProgress("");
      }
    } catch (error) {
      console.error("Failed to get tokens by owner with progress:", error);
      if (onProgress) {
        onProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // === LEGACY COMPATIBILITY METHODS ===

  // Aliases for backward compatibility
  async getOwnerOf(tokenId: string): Promise<string> {
    return this.getTokenOwner(tokenId);
  }

  async getSbtFlag(tokenId: string): Promise<boolean> {
    try {
      return await (this.contract as any)._sbtFlag(tokenId);
    } catch (error) {
      return false;
    }
  }

  async getOriginalTokenInfo(tokenId: string): Promise<any> {
    try {
      const originalInfo = await withCACasher(
        this.contractAddress,
        '_originalTokenInfo',
        [tokenId],
        async () => await (this.contract as any)._originalTokenInfo(tokenId)
      );
      return originalInfo;
    } catch (error) {
      console.error(`Failed to get original token info for token ${tokenId}:`, error);
      return null;
    }
  }

  async getMaxFeeRate(): Promise<string> {
    try {
      const maxFeeRate = await (this.contract as any)._maxFeeRate();
      return maxFeeRate.toString();
    } catch (error) {
      return "1000"; // Default 10%
    }
  }

  // === GETTERS ===

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getContract(): ethers.Contract {
    return this.contract;
  }

  getContractAddress(): string {
    return this.contractAddress;
  }
}

export const nftContract = new NftContractService();