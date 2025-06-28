import { memberService } from './memberService';
import { TbaService } from './tbaService';
import { caCasherClient, withCACasher } from './caCasherClient';
import { NftContractService } from './nftContract';
import { CONTRACT_ADDRESS } from '../constants';
import type { MemberInfo, TBAInfo, AddressNameInfo } from '../types';

export class EOAAddressNameResolver {
  private tbaService: TbaService;
  private cache: Map<string, { data: AddressNameInfo; timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分間キャッシュ

  constructor() {
    this.tbaService = new TbaService();
    this.cache = new Map();
  }

  async resolveAddressToDisplayName(address: string): Promise<AddressNameInfo> {
    const cacheKey = address.toLowerCase();
    const cachedData = this.cache.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < this.CACHE_TTL) {
      console.log(`✅ EOA resolver cache hit for ${address}`);
      return cachedData.data;
    }

    const addressInfo: AddressNameInfo = {
      address,
      displayName: this.formatAddress(address),
      loading: true,
      error: null
    };

    try {
      const [creatorName, memberInfo, tbaInfo] = await Promise.all([
        this.getCreatorName(address),
        this.getMemberInfo(address),
        this.getTBAInfo(address)
      ]);

      addressInfo.creatorName = creatorName;
      addressInfo.memberInfo = memberInfo;
      addressInfo.tbaInfo = tbaInfo;
      addressInfo.displayName = this.getDisplayName(addressInfo);
      addressInfo.loading = false;

      this.cache.set(cacheKey, { data: addressInfo, timestamp: Date.now() });
      
      console.log(`✅ EOA resolver complete for ${address}:`, addressInfo);
      return addressInfo;
    } catch (error) {
      console.error(`❌ EOA resolver failed for ${address}:`, error);
      addressInfo.error = error instanceof Error ? error.message : 'Unknown error';
      addressInfo.loading = false;
      return addressInfo;
    }
  }

  async getCreatorName(address: string): Promise<string> {
    try {
      const creatorName = await withCACasher(
        CONTRACT_ADDRESS,
        'getCreatorName',
        [address],
        async () => {
          const contractService = new NftContractService(CONTRACT_ADDRESS);
          return await contractService.getCreatorName(address);
        }
      );

      return creatorName && creatorName.trim() ? creatorName : '';
    } catch (error) {
      console.error(`❌ Failed to get creator name for ${address}:`, error);
      return '';
    }
  }

  async getMemberInfo(address: string): Promise<MemberInfo | null> {
    try {
      return await memberService.getMemberInfo(address);
    } catch (error) {
      console.error(`❌ Failed to get member info for ${address}:`, error);
      return null;
    }
  }

  async getTBAInfo(address: string): Promise<TBAInfo> {
    try {
      const isTBA = await this.tbaService.isTBAAccount(address);
      
      if (isTBA) {
        const [tbaImage, tbaName, sourceNFT] = await Promise.all([
          this.tbaService.getTBASourceNFTImage(address),
          this.tbaService.getTBASourceNFTName(address),
          this.tbaService.findTBASourceToken(address)
        ]);

        return {
          isTBA: true,
          tbaImage,
          tbaName,
          sourceNFT: sourceNFT ? {
            id: `${sourceNFT.contractAddress}-${sourceNFT.tokenId}`,
            contractAddress: sourceNFT.contractAddress,
            tokenId: sourceNFT.tokenId,
            tokenURI: ''
          } : null
        };
      }

      return { isTBA: false };
    } catch (error) {
      console.error(`❌ Failed to get TBA info for ${address}:`, error);
      return { isTBA: false };
    }
  }

  getDisplayName(addressInfo: AddressNameInfo): string {
    const { memberInfo, tbaInfo, creatorName, address } = addressInfo;

    if (creatorName) {
      return creatorName;
    }

    if (tbaInfo?.isTBA && tbaInfo.tbaName) {
      return tbaInfo.tbaName;
    }

    if (memberInfo) {
      return (
        memberInfo.Nick ||
        memberInfo.nickname ||
        memberInfo.Name ||
        memberInfo.name ||
        memberInfo.Username ||
        memberInfo.username ||
        this.formatAddress(address)
      );
    }

    return this.formatAddress(address);
  }

  formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  async resolveBatch(addresses: string[]): Promise<Map<string, AddressNameInfo>> {
    const results = new Map<string, AddressNameInfo>();
    const batchSize = 3;

    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (address) => {
        const addressInfo = await this.resolveAddressToDisplayName(address);
        return { address, addressInfo };
      });

      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(({ address, addressInfo }) => {
        results.set(address, addressInfo);
      });

      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ EOA resolver cache cleared');
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const eoaAddressNameResolver = new EOAAddressNameResolver();