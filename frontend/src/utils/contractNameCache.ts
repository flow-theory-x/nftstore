import { requestDeduplicator } from "./requestDeduplicator";
import { rateLimiter } from "./rateLimiter";
import { ethers } from "ethers";
import { RPC_URL } from "../constants";
import contractAbi from "../../config/nft_abi.json";

// コントラクト名の静的キャッシュ
const KNOWN_CONTRACT_NAMES: Record<string, string> = {
  // 既知のコントラクトアドレスと名前のマッピング
  // 必要に応じて追加
  // 例: "0x1234...": "MyNFTContract"
};

export class ContractNameCache {
  private static instance: ContractNameCache;
  private cache = new Map<string, { name: string; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10分
  private cleanupInterval: NodeJS.Timeout | null = null;

  public static getInstance(): ContractNameCache {
    if (!ContractNameCache.instance) {
      ContractNameCache.instance = new ContractNameCache();
    }
    return ContractNameCache.instance;
  }

  private constructor() {
    // 既知のコントラクト名を事前にキャッシュ
    Object.entries(KNOWN_CONTRACT_NAMES).forEach(([address, name]) => {
      this.cache.set(address.toLowerCase(), {
        name,
        timestamp: Date.now()
      });
    });
    
    // 定期的なクリーンアップを開始（30分間隔）
    this.startPeriodicCleanup();
  }

  async getContractName(contractAddress: string): Promise<string> {
    const lowerAddress = contractAddress.toLowerCase();
    
    // キャッシュから取得を試行
    const cached = this.cache.get(lowerAddress);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📋 Contract name cache HIT: ${contractAddress} -> ${cached.name}`);
      return cached.name;
    }
    
    // 期限切れキャッシュがある場合でも、新しいリクエスト中は古い値を返す
    if (cached) {
      console.log(`⏰ Contract name cache EXPIRED but using cached value: ${contractAddress} -> ${cached.name}`);
      // バックグラウンドで更新（await しない）
      this.refreshContractName(contractAddress);
      return cached.name;
    }

    // リクエスト重複排除を使用してコントラクト名を取得
    const name = await requestDeduplicator.execute(
      `contract-name-${lowerAddress}`,
      async () => {
        console.log(`🔗 Fetching contract name for: ${contractAddress}`);
        try {
          // 直接ブロックチェーンからコントラクト名を取得
          const provider = new ethers.JsonRpcProvider(RPC_URL);
          const contract = new ethers.Contract(contractAddress, contractAbi, provider);
          
          const contractName = await rateLimiter.executeWithRetry(
            () => (contract as any).name()
          ) as string;
          
          // キャッシュに保存
          this.cache.set(lowerAddress, {
            name: contractName,
            timestamp: Date.now()
          });
          
          console.log(`✅ Contract name fetched: ${contractAddress} -> ${contractName}`);
          return contractName;
        } catch (error) {
          console.warn(`⚠️ Failed to get contract name for ${contractAddress}:`, error);
          // フォールバック名を生成
          const fallbackName = `Contract ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`;
          
          // エラーでもフォールバック名をキャッシュ（1分間）
          this.cache.set(lowerAddress, {
            name: fallbackName,
            timestamp: Date.now() - this.CACHE_DURATION + 60000 // 1分後に期限切れ
          });
          
          return fallbackName;
        }
      }
    );

    return name as string;
  }

  // 複数のコントラクト名を並列取得（レート制限対策）
  async getContractNames(contractAddresses: string[]): Promise<Record<string, string>> {
    console.log(`📡 Fetching names for ${contractAddresses.length} contracts...`);
    
    const results: Record<string, string> = {};
    
    // バッチサイズを制限してレート制限を回避
    const batchSize = 3;
    for (let i = 0; i < contractAddresses.length; i += batchSize) {
      const batch = contractAddresses.slice(i, i + batchSize);
      
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(contractAddresses.length / batchSize)}`);
      
      const batchPromises = batch.map(async (address) => {
        const name = await this.getContractName(address);
        return { address, name };
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(({ address, name }) => {
        results[address] = name;
      });
      
      // 次のバッチまで少し待機
      if (i + batchSize < contractAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ All contract names fetched:`, results);
    return results;
  }

  // 既知のコントラクト名を事前設定
  setKnownContractName(address: string, name: string) {
    this.cache.set(address.toLowerCase(), {
      name,
      timestamp: Date.now()
    });
    console.log(`📝 Manually set contract name: ${address} -> ${name}`);
  }
  
  // 複数のコントラクト名を事前設定
  setKnownContractNames(contracts: Record<string, string>) {
    Object.entries(contracts).forEach(([address, name]) => {
      this.setKnownContractName(address, name);
    });
    console.log(`📝 Bulk set ${Object.keys(contracts).length} contract names`);
  }

  // 定期的なクリーンアップを開始
  private startPeriodicCleanup() {
    // ブラウザ環境でのみ実行
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpiredCache();
      }, 30 * 60 * 1000); // 30分間隔
      
      console.log('🔄 Contract name cache periodic cleanup started (30 minute intervals)');
    }
  }

  // 定期的なクリーンアップを停止
  private stopPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('⏹️ Contract name cache periodic cleanup stopped');
    }
  }

  // キャッシュをクリア
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Contract name cache cleared');
  }

  // バックグラウンドでコントラクト名を更新
  private async refreshContractName(contractAddress: string) {
    try {
      console.log(`🔄 Background refresh for contract name: ${contractAddress}`);
      
      // 直接ブロックチェーンから取得
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(contractAddress, contractAbi, provider);
      
      const contractName = await rateLimiter.executeWithRetry(
        () => (contract as any).name()
      ) as string;
      
      this.cache.set(contractAddress.toLowerCase(), {
        name: contractName,
        timestamp: Date.now()
      });
      
      console.log(`✅ Background refresh completed: ${contractAddress} -> ${contractName}`);
    } catch (error) {
      console.warn(`⚠️ Background refresh failed for ${contractAddress}:`, error);
    }
  }

  // 期限切れキャッシュをクリーンアップ
  cleanupExpiredCache() {
    const now = Date.now();
    const knownAddresses = new Set(Object.keys(KNOWN_CONTRACT_NAMES).map(addr => addr.toLowerCase()));
    let removedCount = 0;
    
    for (const [address, data] of this.cache.entries()) {
      // 既知のコントラクトは削除しない
      if (knownAddresses.has(address)) {
        continue;
      }
      
      // 期限切れのエントリを削除
      if (now - data.timestamp > this.CACHE_DURATION) {
        this.cache.delete(address);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired contract name cache entries`);
    }
    
    return removedCount;
  }

  // キャッシュ統計を取得
  getCacheStats() {
    const now = Date.now();
    return {
      size: this.cache.size,
      cacheDuration: this.CACHE_DURATION,
      entries: Array.from(this.cache.entries()).map(([address, data]) => ({
        address,
        name: data.name,
        age: now - data.timestamp,
        isExpired: now - data.timestamp > this.CACHE_DURATION,
        expiresIn: Math.max(0, this.CACHE_DURATION - (now - data.timestamp))
      }))
    };
  }
}

export const contractNameCache = ContractNameCache.getInstance();