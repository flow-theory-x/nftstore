import { ethers } from "ethers";
import { CONTRACT_ADDRESS, RPC_URL, DEAD_ADDRESS } from "../constants";
import type { NFTToken, ContractInfo } from "../types";
import contractAbi from "../../config/nft_abi.json";
import { cacheService } from "./cache";

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

  async getMintFee(): Promise<string> {
    try {
      const fee = await (this.contract as any).getMintFee();
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
    customFee?: string
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const contractWithSigner = this.contract.connect(signer);

      let mintFee: string;
      if (customFee !== undefined) {
        mintFee = customFee;
      } else {
        mintFee = await this.getMintFee();
      }

      const tx = await (contractWithSigner as any).mint(to, metaUrl, {
        value: ethers.parseEther(mintFee),
      });

      return tx;
    } catch (error) {
      console.error("Failed to mint NFT:", error);
      throw error;
    }
  }

  async getTotalSupply(): Promise<number> {
    try {
      console.log("🔗 Blockchain CALL: getTotalSupply");
      const supply = await (this.contract as any).totalSupply();
      const result = Number(supply);
      return result;
    } catch (error) {
      console.error("Failed to get total supply:", error);
      throw error;
    }
  }

  async getName(): Promise<string> {
    try {
      console.log("🔗 Blockchain CALL: getName (no cache)");
      const name = await (this.contract as any).name();
      return name;
    } catch (error) {
      console.error("Failed to get contract name:", error);
      throw error;
    }
  }

  async getTokenByIndex(index: number): Promise<string> {
    try {
      const tokenId = await (this.contract as any).tokenByIndex(index);
      return tokenId.toString();
    } catch (error) {
      console.error("Failed to get token by index:", error);
      throw error;
    }
  }

  async getTokenURI(tokenId: string): Promise<string> {
    try {
      const cached = cacheService.getTokenInfo(this.contractAddress, tokenId);
      if (cached?.tokenURI) {
        console.log("📋 Cache HIT: getTokenURI", tokenId, cached.tokenURI);
        return cached.tokenURI;
      }

      console.log("🔗 Blockchain CALL: getTokenURI", tokenId);
      const uri = await (this.contract as any).tokenURI(tokenId);

      // Update cache with token info
      const existingInfo = cached || {};
      cacheService.setTokenInfo(this.contractAddress, tokenId, {
        ...existingInfo,
        tokenURI: uri,
      });
      console.log("💾 Cache SET: getTokenURI", tokenId, uri);

      return uri;
    } catch (error) {
      console.error("Failed to get token URI:", error);
      throw error;
    }
  }

  async getOwnerOf(tokenId: string): Promise<string> {
    try {
      console.log("🔗 Blockchain CALL: getOwnerOf (no cache)", tokenId);
      const owner = await (this.contract as any).ownerOf(tokenId);
      return owner;
    } catch (error) {
      console.error("Failed to get owner of token:", error);
      throw error;
    }
  }

  async getBalanceOf(owner: string): Promise<number> {
    try {
      console.log("🔗 Blockchain CALL: getBalanceOf (no cache)", owner);
      const balance = await (this.contract as any).balanceOf(owner);
      return Number(balance);
    } catch (error) {
      console.error("Failed to get balance:", error);
      throw error;
    }
  }

  async getTokenOfOwnerByIndex(owner: string, index: number): Promise<string> {
    try {
      const tokenId = await (this.contract as any).tokenOfOwnerByIndex(
        owner,
        index
      );
      return tokenId.toString();
    } catch (error) {
      console.error("Failed to get token of owner by index:", error);
      throw error;
    }
  }

  async getAllTokens(): Promise<NFTToken[]> {
    try {
      const totalSupply = await this.getTotalSupply();
      const tokens: NFTToken[] = [];

      for (let i = 0; i < totalSupply; i++) {
        const tokenId = await this.getTokenByIndex(i);
        const owner = await this.getOwnerOf(tokenId);
        
        // BURN済み（dead addressが所有）のトークンはスキップ
        if (owner.toLowerCase() === DEAD_ADDRESS.toLowerCase()) {
          console.log(`🔥 Skipping burned token: ${tokenId} (owner: ${owner})`);
          continue;
        }
        
        const tokenURI = await this.getTokenURI(tokenId);

        tokens.push({
          tokenId,
          owner,
          tokenURI,
        });
      }

      return tokens;
    } catch (error) {
      console.error("Failed to get all tokens:", error);
      throw error;
    }
  }

  async getTokensBatch(
    startIndex: number,
    batchSize: number
  ): Promise<{ tokens: NFTToken[]; hasMore: boolean }> {
    try {
      const cached = cacheService.getBatchTokens(
        this.contractAddress,
        startIndex,
        batchSize
      );
      if (cached) {
        console.log(
          "📋 Cache HIT: getTokensBatch",
          startIndex,
          batchSize,
          cached.tokens.length + " tokens"
        );
        return cached;
      }

      console.log(
        "🔗 Blockchain BATCH CALL: getTokensBatch",
        startIndex,
        batchSize
      );
      
      // 全トークンIDリストをキャッシュから取得または作成
      let allTokenIds = cacheService.getContractData<string[]>(this.contractAddress, 'allTokenIds');
      if (!allTokenIds) {
        console.log('🔗 Fetching all token IDs for sorting...');
        const totalSupply = await this.getTotalSupply();
        console.log('📊 Total supply:', totalSupply);
        
        allTokenIds = [];
        for (let i = 0; i < totalSupply; i++) {
          const tokenId = await this.getTokenByIndex(i);
          allTokenIds.push(tokenId);
        }
        
        // トークンIDで降順ソート（最新が最初）
        allTokenIds.sort((a, b) => parseInt(b) - parseInt(a));
        console.log('🔢 Sorted token IDs:', allTokenIds);
        
        // 1分間キャッシュ（新しいミントを考慮して短めに設定）
        cacheService.setContractData(this.contractAddress, 'allTokenIds', allTokenIds);
      } else {
        console.log('📋 Using cached token IDs:', allTokenIds);
      }
      
      // 指定されたバッチ範囲のトークンのみ詳細取得
      const batchTokenIds = allTokenIds.slice(startIndex, startIndex + batchSize);
      console.log('📦 Batch token IDs:', batchTokenIds);
      
      const tokens: NFTToken[] = [];
      for (const tokenId of batchTokenIds) {
        const owner = await this.getOwnerOf(tokenId);
        
        // BURN済み（dead addressが所有）のトークンはスキップ
        if (owner.toLowerCase() === DEAD_ADDRESS.toLowerCase()) {
          console.log(`🔥 Skipping burned token: ${tokenId} (owner: ${owner})`);
          continue;
        }
        
        const tokenURI = await this.getTokenURI(tokenId);

        tokens.push({
          tokenId,
          owner,
          tokenURI,
        });
      }

      const result = {
        tokens,
        hasMore: startIndex + batchSize < allTokenIds.length,
      };

      cacheService.setBatchTokens(
        this.contractAddress,
        startIndex,
        batchSize,
        result
      );
      console.log(
        "💾 Cache SET: getTokensBatch",
        startIndex,
        batchSize,
        tokens.length + " tokens"
      );
      return result;
    } catch (error) {
      console.error("Failed to get tokens batch:", error);
      throw error;
    }
  }

  async getTokensByOwner(owner: string): Promise<NFTToken[]> {
    try {
      // BURN済み（dead address）のトークンは検索しない
      if (owner.toLowerCase() === DEAD_ADDRESS.toLowerCase()) {
        console.log(`🔥 Skipping tokens for burned address: ${owner}`);
        return [];
      }
      
      const balance = await this.getBalanceOf(owner);
      const tokens: NFTToken[] = [];

      for (let i = 0; i < balance; i++) {
        const tokenId = await this.getTokenOfOwnerByIndex(owner, i);
        const tokenURI = await this.getTokenURI(tokenId);

        tokens.push({
          tokenId,
          owner,
          tokenURI,
        });
      }

      // tokenIdの降順でソート（新しいものが最初に表示される）
      return tokens.sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId));
    } catch (error) {
      console.error("Failed to get tokens by owner:", error);
      throw error;
    }
  }

  async burn(
    tokenId: string,
    signer: ethers.JsonRpcSigner
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const contractWithSigner = this.contract.connect(signer);

      // Check if the signer is the owner of the token
      const signerAddress = await signer.getAddress();
      const tokenOwner = await this.getOwnerOf(tokenId);

      if (signerAddress.toLowerCase() !== tokenOwner.toLowerCase()) {
        throw new Error("Only the token owner can burn this NFT");
      }

      const tx = await (contractWithSigner as any).burn(tokenId);
      return tx;
    } catch (error) {
      console.error("Failed to burn NFT:", error);
      throw error;
    }
  }

  async transfer(
    tokenId: string,
    to: string,
    signer: ethers.JsonRpcSigner
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const contractWithSigner = this.contract.connect(signer);

      // Check if the signer is the owner of the token
      const signerAddress = await signer.getAddress();
      const tokenOwner = await this.getOwnerOf(tokenId);

      if (signerAddress.toLowerCase() !== tokenOwner.toLowerCase()) {
        throw new Error("Only the token owner can transfer this NFT");
      }

      // Validate the recipient address
      if (!ethers.isAddress(to)) {
        throw new Error("Invalid recipient address");
      }

      // Use safeTransferFrom for ERC721 transfer
      const tx = await (contractWithSigner as any).safeTransferFrom(
        signerAddress,
        to,
        tokenId
      );
      return tx;
    } catch (error) {
      console.error("Failed to transfer NFT:", error);
      throw error;
    }
  }

  async getContractInfo(): Promise<ContractInfo> {
    try {
      const [creator, feeRate, creatorOnly] = await (
        this.contract as any
      ).getInfo();
      return {
        creator,
        feeRate: feeRate.toString(),
        creatorOnly,
      };
    } catch (error) {
      console.error("Failed to get contract info:", error);
      throw error;
    }
  }

  async fetchMetadata(tokenURI: string): Promise<any> {
    try {
      const cached = cacheService.getTokenMetadata(tokenURI);
      if (cached) {
        console.log(
          "📋 Cache HIT: fetchMetadata",
          tokenURI.substring(0, 50) + "..."
        );
        return cached;
      }

      console.log(
        "🌐 HTTP CALL: fetchMetadata",
        tokenURI.substring(0, 50) + "..."
      );
      const response = await fetch(tokenURI);
      if (!response.ok) {
        throw new Error("Failed to fetch metadata");
      }
      const metadata = await response.json();
      cacheService.setTokenMetadata(tokenURI, metadata);
      console.log(
        "💾 Cache SET: fetchMetadata",
        tokenURI.substring(0, 50) + "...",
        metadata.name || "Untitled"
      );
      return metadata;
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
      return null;
    }
  }
}
