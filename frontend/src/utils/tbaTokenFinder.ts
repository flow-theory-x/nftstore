import { ethers } from "ethers";
import { RPC_URL, DEAD_ADDRESS } from "../constants";

/**
 * 指定されたアドレスが保有するNFTを検索する独立したユーティリティ
 */
export class TBATokenFinder {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
  }

  /**
   * Transfer イベントを使用してNFTを効率的に検索（推奨方法）
   */
  async findOwnedTokens(
    ownerAddress: string,
    contractAddress: string,
    fromBlock: number | "fallback" = 0
  ): Promise<string[]> {
    // フォールバック検索が指定された場合、直接実行
    if (fromBlock === "fallback") {
      console.log(`🔄 Using direct fallback search for ${ownerAddress}`);
      return await this.fallbackTokenSearch(ownerAddress, contractAddress);
    }

    try {
      console.log(`🔍 Efficiently searching NFTs owned by ${ownerAddress} using Transfer events`);
      
      const erc721Abi = [
        "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
        "function ownerOf(uint256 tokenId) view returns (address)"
      ];

      const contract = new ethers.Contract(contractAddress, erc721Abi, this.provider);
      
      // このアドレスへの全てのTransferイベントを取得（タイムアウト付き）
      const filter = contract.filters.Transfer(null, ownerAddress);
      console.log(`🔍 Querying Transfer events from block ${fromBlock} to ${ownerAddress}`);
      
      // 10秒でタイムアウト
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 10000);
      });
      
      const events = await Promise.race([
        contract.queryFilter(filter, fromBlock),
        timeoutPromise
      ]);
      
      console.log(`📋 Raw events found:`, events.length);
      
      console.log(`📊 Found ${events.length} Transfer events to ${ownerAddress}`);
      
      // イベントからトークンIDを抽出
      const potentialTokens = events
        .map(event => {
          // EventLogかどうかをチェックしてargsにアクセス
          if ('args' in event && event.args) {
            return event.args.tokenId?.toString();
          }
          return null;
        })
        .filter(Boolean) as string[];
      
      // 重複を除去
      const uniqueTokens = [...new Set(potentialTokens)];
      console.log(`🔄 Checking ownership of ${uniqueTokens.length} unique tokens`);
      
      // 現在も所有しているかバッチで確認
      const ownedTokens: string[] = [];
      const batchSize = 10;
      
      for (let i = 0; i < uniqueTokens.length; i += batchSize) {
        const batch = uniqueTokens.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(async (tokenId) => {
            try {
              const currentOwner = await (contract as any).ownerOf(tokenId);
              
              // BURN済み（dead addressが所有）のトークンはスキップ
              if (currentOwner.toLowerCase() === DEAD_ADDRESS.toLowerCase()) {
                console.log(`🔥 Skipping burned token: ${tokenId} (owner: ${currentOwner})`);
                return { tokenId, isOwned: false };
              }
              
              return {
                tokenId,
                isOwned: currentOwner.toLowerCase() === ownerAddress.toLowerCase()
              };
            } catch {
              return { tokenId, isOwned: false };
            }
          })
        );
        
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.isOwned) {
            ownedTokens.push(result.value.tokenId);
            console.log(`✅ Confirmed owned token: ${result.value.tokenId}`);
          }
        });
      }

      console.log(`🎯 Found ${ownedTokens.length} tokens currently owned by ${ownerAddress}`);
      
      // イベントベースの検索で結果がない場合、フォールバック検索を実行
      if (ownedTokens.length === 0) {
        console.log(`⚠️ No tokens found via events, trying fallback method...`);
        return await this.fallbackTokenSearch(ownerAddress, contractAddress);
      }
      
      return ownedTokens.sort((a, b) => parseInt(a) - parseInt(b));
    } catch (error) {
      console.error("Failed to find owned tokens:", error);
      console.log(`⚠️ Error occurred, trying fallback method...`);
      return await this.fallbackTokenSearch(ownerAddress, contractAddress);
    }
  }

  /**
   * フォールバック検索方法：直接ownerOfをチェック
   */
  private async fallbackTokenSearch(
    ownerAddress: string,
    contractAddress: string
  ): Promise<string[]> {
    try {
      console.log(`🔄 Running fallback search for ${ownerAddress}`);
      console.log(`🎯 Target address (lowercase): ${ownerAddress.toLowerCase()}`);
      
      const erc721Abi = [
        "function totalSupply() view returns (uint256)",
        "function ownerOf(uint256 tokenId) view returns (address)",
        "function tokenByIndex(uint256 index) view returns (uint256)",
        "function balanceOf(address owner) view returns (uint256)",
        "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)"
      ];

      const contract = new ethers.Contract(contractAddress, erc721Abi, this.provider);
      const ownedTokens: string[] = [];

      try {
        // Method 1: tokenOfOwnerByIndex を最優先で試す（最も効率的）
        try {
          console.log(`🚀 Trying tokenOfOwnerByIndex method (most efficient)...`);
          const balanceBigInt = await (contract as any).balanceOf(ownerAddress);
          const balance = Number(balanceBigInt);
          console.log(`💰 Owner balance: ${balance} tokens`);
          
          if (balance > 0) {
            for (let i = 0; i < balance; i++) {
              try {
                const tokenIdBigInt = await (contract as any).tokenOfOwnerByIndex(ownerAddress, i);
                const tokenId = Number(tokenIdBigInt);
                ownedTokens.push(tokenId.toString());
                console.log(`✅ tokenOfOwnerByIndex found token: ${tokenId}`);
              } catch (error) {
                console.log(`⚠️ tokenOfOwnerByIndex(${i}) failed: ${error}`);
              }
            }
            
            console.log(`🎯 tokenOfOwnerByIndex found ${ownedTokens.length} tokens:`, ownedTokens);
            return ownedTokens.sort((a, b) => parseInt(a) - parseInt(b));
          } else {
            console.log(`📊 Owner has 0 tokens according to balanceOf`);
            return [];
          }
        } catch (error) {
          console.log(`❌ tokenOfOwnerByIndex not supported: ${error}`);
          console.log(`🔄 Falling back to alternative methods...`);
        }

        // Method 2: tokenByIndex でフォールバック
        const totalSupplyBigInt = await (contract as any).totalSupply();
        const totalSupply = Number(totalSupplyBigInt);
        console.log(`📊 Total supply: ${totalSupply}`);

        let actualTokenIds: number[] = [];
        try {
          console.log(`🔍 Trying tokenByIndex method...`);
          for (let i = 0; i < totalSupply; i++) {
            try {
              const tokenIdBigInt = await (contract as any).tokenByIndex(i);
              const tokenId = Number(tokenIdBigInt);
              actualTokenIds.push(tokenId);
            } catch (error) {
              console.log(`⚠️ tokenByIndex(${i}) failed: ${error}`);
              break;
            }
          }
          console.log(`📋 Found actual token IDs via tokenByIndex:`, actualTokenIds);
        } catch (error) {
          console.log(`❌ tokenByIndex not supported: ${error}`);
        }

        // Method 3: 範囲検索でフォールバック
        let tokensToCheck: number[];
        if (actualTokenIds.length > 0) {
          tokensToCheck = actualTokenIds;
          console.log(`✅ Using tokenByIndex results: ${tokensToCheck.length} tokens`);
        } else {
          const maxCheck = Math.max(totalSupply * 2, 100);
          tokensToCheck = Array.from({ length: maxCheck }, (_, i) => i + 1);
          console.log(`🔍 Using range search: 1 to ${maxCheck}`);
        }

        const batchSize = 5;
        for (let i = 0; i < tokensToCheck.length; i += batchSize) {
          const batch = tokensToCheck.slice(i, i + batchSize);

          const results = await Promise.allSettled(
            batch.map(async (tokenId) => {
              try {
                const owner = await (contract as any).ownerOf(tokenId);
                return { tokenId: tokenId.toString(), owner, success: true };
              } catch (error) {
                return { tokenId: tokenId.toString(), owner: null, success: false };
              }
            })
          );

          results.forEach((result) => {
            if (result.status === 'fulfilled') {
              const value = result.value;
              if (value.success && value.owner) {
                console.log(`🔍 Token ${value.tokenId} owned by: ${value.owner}`);
                
                // BURN済み（dead addressが所有）のトークンはスキップ
                if (value.owner.toLowerCase() === DEAD_ADDRESS.toLowerCase()) {
                  console.log(`🔥 Skipping burned token: ${value.tokenId} (owner: ${value.owner})`);
                  return;
                }
                
                if (value.owner.toLowerCase() === ownerAddress.toLowerCase()) {
                  ownedTokens.push(value.tokenId);
                  console.log(`✅ Range search found owned token: ${value.tokenId}`);
                }
              }
            }
          });

          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error("Fallback method failed:", error);
      }

      console.log(`🎯 Fallback found ${ownedTokens.length} tokens`);
      return ownedTokens.sort((a, b) => parseInt(a) - parseInt(b));
    } catch (error) {
      console.error("Fallback search failed:", error);
      return [];
    }
  }

  /**
   * 複数のコントラクトで保有するNFTを検索
   */
  async findOwnedTokensAcrossContracts(
    ownerAddress: string,
    contractAddresses: string[]
  ): Promise<{ [contractAddress: string]: string[] }> {
    const results: { [contractAddress: string]: string[] } = {};

    for (const contractAddress of contractAddresses) {
      console.log(`🔍 Checking contract: ${contractAddress}`);
      const tokens = await this.findOwnedTokens(ownerAddress, contractAddress);
      results[contractAddress] = tokens;
    }

    return results;
  }

}

// 簡単に使用するためのヘルパー関数
export async function findTBAOwnedTokens(
  tbaAddress: string,
  contractAddress: string,
  fromBlock?: number | "fallback"
): Promise<string[]> {
  const finder = new TBATokenFinder();
  return await finder.findOwnedTokens(tbaAddress, contractAddress, fromBlock);
}