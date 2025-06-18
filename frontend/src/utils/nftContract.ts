import { ethers } from "ethers";
import { CONTRACT_ADDRESS, RPC_URL, DEAD_ADDRESS } from "../constants";
import type { NFTToken, ContractInfo } from "../types";
import contractAbi from "../../config/nft_abi.json";
import { cacheService } from "./cache";
import { rateLimiter } from "./rateLimiter";

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
      const cached = cacheService.getContractData<number>(this.contractAddress, 'totalSupply');
      if (cached !== null && cached !== undefined) {
        console.log("📋 Cache HIT: getTotalSupply", cached);
        return cached;
      }

      return rateLimiter.executeWithRetry(async () => {
        console.log("🔗 Blockchain CALL: getTotalSupply");
        const supply = await (this.contract as any).totalSupply();
        const result = Number(supply);
        
        // 総供給量は比較的変わりにくいので30分キャッシュ（新しいミントを考慮）
        cacheService.setContractData(this.contractAddress, 'totalSupply', result, 30 * 60 * 1000);
        console.log("💾 Cache SET: getTotalSupply", result);
        
        return result;
      });
    } catch (error) {
      console.error("Failed to get total supply:", error);
      throw error;
    }
  }

  async getName(): Promise<string> {
    try {
      const cached = cacheService.getContractData<string>(this.contractAddress, 'name');
      if (cached) {
        console.log("📋 Cache HIT: getName", cached);
        return cached;
      }

      return rateLimiter.executeWithRetry(async () => {
        console.log("🔗 Blockchain CALL: getName");
        const name = await (this.contract as any).name();
        
        // コントラクト名は変わらないので長期間キャッシュ（24時間）
        cacheService.setContractData(this.contractAddress, 'name', name, 24 * 60 * 60 * 1000);
        console.log("💾 Cache SET: getName", name);
        
        return name;
      });
    } catch (error) {
      console.error("Failed to get contract name:", error);
      throw error;
    }
  }

  async getTokenByIndex(index: number): Promise<string> {
    return rateLimiter.execute(async () => {
      const tokenId = await (this.contract as any).tokenByIndex(index);
      return tokenId.toString();
    });
  }

  async getTokenURI(tokenId: string): Promise<string> {
    try {
      const cached = cacheService.getTokenInfo(this.contractAddress, tokenId);
      if (cached?.tokenURI) {
        console.log("📋 Cache HIT: getTokenURI", tokenId, cached.tokenURI);
        return cached.tokenURI;
      }

      console.log("🔗 Blockchain CALL: getTokenURI", tokenId);
      const uri = await rateLimiter.execute(async () => {
        return await (this.contract as any).tokenURI(tokenId);
      });

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
    return rateLimiter.execute(async () => {
      console.log("🔗 Blockchain CALL: getOwnerOf (no cache)", tokenId);
      const owner = await (this.contract as any).ownerOf(tokenId);
      return owner;
    });
  }

  async getBalanceOf(owner: string): Promise<number> {
    try {
      const cacheKey = `balance_${owner.toLowerCase()}`;
      const cached = cacheService.getContractData<number>(this.contractAddress, cacheKey);
      if (cached !== null && cached !== undefined) {
        console.log("📋 Cache HIT: getBalanceOf", owner, cached);
        return cached;
      }

      return rateLimiter.execute(async () => {
        console.log("🔗 Blockchain CALL: getBalanceOf", owner);
        const balance = await (this.contract as any).balanceOf(owner);
        const result = Number(balance);
        
        // バランスは変わりやすいので短期間キャッシュ（5分）
        cacheService.setContractData(this.contractAddress, cacheKey, result, 5 * 60 * 1000);
        console.log("💾 Cache SET: getBalanceOf", owner, result);
        
        return result;
      });
    } catch (error) {
      console.error("Failed to get balance:", error);
      throw error;
    }
  }

  async getTokenOfOwnerByIndex(owner: string, index: number): Promise<string> {
    return rateLimiter.execute(async () => {
      const tokenId = await (this.contract as any).tokenOfOwnerByIndex(
        owner,
        index
      );
      return tokenId.toString();
    });
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
          contractAddress: this.contractAddress,
        });
      }

      return tokens;
    } catch (error) {
      console.error("Failed to get all tokens:", error);
      throw error;
    }
  }

  async getTokensBatchWithProgress(
    startIndex: number,
    batchSize: number,
    onProgress?: (message: string, tokenId?: string) => void
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
        onProgress?.('Fast loading recent tokens...');
        console.log('🔗 Fast initial load with progress: getting recent tokens only');
        const totalSupply = await this.getTotalSupply();
        console.log('📊 Total supply:', totalSupply);
        
        // 高速化：最初は最新のトークンIDから逆順で取得
        const maxTokensToFetch = Math.min(totalSupply, 20); // 最初は20個まで
        allTokenIds = [];
        
        onProgress?.('Loading latest tokens...');
        // 最新のトークンIDから逆順で取得（最新が最初に表示される）
        for (let i = totalSupply - 1; i >= Math.max(0, totalSupply - maxTokensToFetch); i--) {
          try {
            onProgress?.(`Getting token ID ${totalSupply - i}/${maxTokensToFetch}`);
            const tokenId = await this.getTokenByIndex(i);
            allTokenIds.push(tokenId);
          } catch (error) {
            console.warn(`Failed to get tokenByIndex(${i}):`, error);
            // エラーが発生したトークンはスキップして続行
          }
        }
        
        console.log('🔢 Fast loaded token IDs with progress:', allTokenIds);
        
        // 短期間キャッシュ（完全なリストではないので短めに設定）
        cacheService.setContractData(this.contractAddress, 'allTokenIds', allTokenIds, 2 * 60 * 1000); // 2分
        
        // バックグラウンドで全リストを非同期取得
        this.loadAllTokenIdsInBackground(totalSupply);
      } else {
        console.log('📋 Using cached token IDs:', allTokenIds);
      }
      
      // 指定されたバッチ範囲のトークンのみ詳細取得
      const batchTokenIds = allTokenIds.slice(startIndex, startIndex + batchSize);
      console.log('📦 Batch token IDs:', batchTokenIds);
      
      const tokens: NFTToken[] = [];
      for (let i = 0; i < batchTokenIds.length; i++) {
        const tokenId = batchTokenIds[i];
        onProgress?.('Getting owner info', tokenId);
        const owner = await this.getOwnerOf(tokenId);
        
        // BURN済み（dead addressが所有）のトークンはスキップ
        if (owner.toLowerCase() === DEAD_ADDRESS.toLowerCase()) {
          console.log(`🔥 Skipping burned token: ${tokenId} (owner: ${owner})`);
          continue;
        }
        
        onProgress?.('Getting metadata', tokenId);
        const tokenURI = await this.getTokenURI(tokenId);

        tokens.push({
          tokenId,
          owner,
          tokenURI,
          contractAddress: this.contractAddress,
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
        console.log('🔗 Fast initial load: getting recent tokens only');
        const totalSupply = await this.getTotalSupply();
        console.log('📊 Total supply:', totalSupply);
        
        // 高速化：最初のバッチの場合は最新のトークンIDから逆順で取得
        const maxTokensToFetch = Math.min(totalSupply, 20); // 最初は20個まで
        allTokenIds = [];
        
        // 最新のトークンIDから逆順で取得（最新が最初に表示される）
        for (let i = totalSupply - 1; i >= Math.max(0, totalSupply - maxTokensToFetch); i--) {
          try {
            const tokenId = await this.getTokenByIndex(i);
            allTokenIds.push(tokenId);
          } catch (error) {
            console.warn(`Failed to get tokenByIndex(${i}):`, error);
            // エラーが発生したトークンはスキップして続行
          }
        }
        
        console.log('🔢 Fast loaded token IDs:', allTokenIds);
        
        // 短期間キャッシュ（完全なリストではないので短めに設定）
        cacheService.setContractData(this.contractAddress, 'allTokenIds', allTokenIds, 2 * 60 * 1000); // 2分
        
        // バックグラウンドで全リストを非同期取得
        this.loadAllTokenIdsInBackground(totalSupply);
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
          contractAddress: this.contractAddress,
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

  async getTokensByOwnerWithProgress(
    owner: string,
    onProgress?: (message: string, tokenId?: string) => void
  ): Promise<NFTToken[]> {
    try {
      // BURN済み（dead address）のトークンは検索しない
      if (owner.toLowerCase() === DEAD_ADDRESS.toLowerCase()) {
        console.log(`🔥 Skipping tokens for burned address: ${owner}`);
        return [];
      }
      
      onProgress?.('Getting balance...');
      const balance = await this.getBalanceOf(owner);
      const tokens: NFTToken[] = [];

      for (let i = 0; i < balance; i++) {
        onProgress?.(`Getting token ${i + 1}/${balance}`);
        const tokenId = await this.getTokenOfOwnerByIndex(owner, i);
        
        onProgress?.('Getting metadata', tokenId);
        const tokenURI = await this.getTokenURI(tokenId);

        tokens.push({
          tokenId,
          owner,
          tokenURI,
          contractAddress: this.contractAddress,
        });
      }

      // tokenIdの降順でソート（新しいものが最初に表示される）
      return tokens.sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId));
    } catch (error) {
      console.error("Failed to get tokens by owner:", error);
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
          contractAddress: this.contractAddress,
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

  // バックグラウンドで全トークンIDリストを非同期取得
  private async loadAllTokenIdsInBackground(totalSupply: number): Promise<void> {
    // 既に完全なリストが存在する場合はスキップ
    const fullListKey = 'allTokenIds_full';
    const existingFullList = cacheService.getContractData<string[]>(this.contractAddress, fullListKey);
    if (existingFullList && existingFullList.length >= totalSupply) {
      console.log('📋 Full token list already exists, skipping background load');
      return;
    }

    console.log('🔄 Starting background load of all token IDs...');
    
    // 非同期でバックグラウンド処理
    setTimeout(async () => {
      try {
        const allTokenIds: string[] = [];
        const batchSize = 10;
        
        for (let i = 0; i < totalSupply; i += batchSize) {
          const batch = Array.from(
            { length: Math.min(batchSize, totalSupply - i) },
            (_, index) => i + index
          );
          
          const results = await Promise.allSettled(
            batch.map(async (index) => {
              try {
                return await this.getTokenByIndex(index);
              } catch {
                return null;
              }
            })
          );
          
          results.forEach((result, idx) => {
            if (result.status === 'fulfilled' && result.value) {
              allTokenIds.push(result.value);
            }
          });
          
          // バックグラウンド処理なのでゆっくりと
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // トークンIDで降順ソート（最新が最初）
        allTokenIds.sort((a, b) => parseInt(b) - parseInt(a));
        console.log('✅ Background load completed. Total tokens:', allTokenIds.length);
        
        // 完全なリストとして長期間キャッシュ
        cacheService.setContractData(this.contractAddress, fullListKey, allTokenIds, 30 * 60 * 1000); // 30分
        cacheService.setContractData(this.contractAddress, 'allTokenIds', allTokenIds, 30 * 60 * 1000); // 通常キャッシュも更新
        
      } catch (error) {
        console.error('Background token loading failed:', error);
      }
    }, 1000); // 1秒後に開始
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
