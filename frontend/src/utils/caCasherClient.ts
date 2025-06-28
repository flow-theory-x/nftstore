import { CA_CASHER_BASE_URL, isCACasherEnabled, CONTRACT_ADDRESS } from '../constants';

/**
 * CA Casher対応関数のマッピング
 */
const CA_CASHER_SUPPORTED_FUNCTIONS = {
  // パラメータなしの関数
  'name': { params: [], cacheTime: '24h' },
  'symbol': { params: [], cacheTime: '24h' },
  'totalSupply': { params: [], cacheTime: '5m' },
  'INVERSE_BASIS_POINT': { params: [], cacheTime: '24h' },
  '_lastId': { params: [], cacheTime: '1m' },
  '_maxFeeRate': { params: [], cacheTime: '1h' },
  '_mintFee': { params: [], cacheTime: '1h' },
  '_owner': { params: [], cacheTime: '1h' },
  '_totalBurned': { params: [], cacheTime: '5m' },
  'getCreatorCount': { params: [], cacheTime: '5m' },
  'getCreators': { params: [], cacheTime: '5m' },
  'getTotalBurned': { params: [], cacheTime: '5m' },
  
  // パラメータありの関数
  'tokenURI': { params: ['tokenId'], cacheTime: '1h' },
  'ownerOf': { params: ['tokenId'], cacheTime: '5m' },
  'getApproved': { params: ['tokenId'], cacheTime: '5m' },
  'getTokenCreator': { params: ['tokenId'], cacheTime: '24h' },
  '_originalTokenInfo': { params: ['tokenId'], cacheTime: '1h' },
  '_sbtFlag': { params: ['tokenId'], cacheTime: '1h' },
  'tokenByIndex': { params: ['tokenId'], cacheTime: '5m' },
  'royalties': { params: ['tokenId'], cacheTime: '24h' },
  
  'balanceOf': { params: ['address'], cacheTime: '1m' },
  '_importers': { params: ['address'], cacheTime: '1h' },
  '_totalDonations': { params: ['address'], cacheTime: '5m' },
  'getCreatorName': { params: ['address'], cacheTime: '1h' },
  'getCreatorTokenCount': { params: ['address'], cacheTime: '5m' },
  'getCreatorTokens': { params: ['address'], cacheTime: '5m' },
  
  'isApprovedForAll': { params: ['owner', 'operator'], cacheTime: '5m' },
  'royaltyInfo': { params: ['tokenId', 'salePrice'], cacheTime: '24h' },
  'tokenOfOwnerByIndex': { params: ['owner', 'index'], cacheTime: '1m' },
  
  'supportsInterface': { params: ['interfaceId'], cacheTime: '24h' }
};

/**
 * CA Casherレスポンス形式
 */
interface CACasherResponse {
  result: any;
  cached: boolean;
  cachedAt?: string;
}

/**
 * CA Casherエラーレスポンス
 */
interface CACasherError {
  error: string;
  message: string;
}

/**
 * CA Casher クライアント
 */
export class CACasherClient {
  private baseUrl: string;
  private contractAddress: string;

  constructor(contractAddress: string, baseUrl?: string) {
    this.contractAddress = contractAddress.toLowerCase();
    // 開発環境ではプロキシを使用、本番環境では直接API
    if (!baseUrl) {
      this.baseUrl = import.meta.env.DEV 
        ? '/api/ca-casher'  // 開発環境: Viteプロキシ経由
        : CA_CASHER_BASE_URL;  // 本番環境: 直接API
    } else {
      this.baseUrl = baseUrl;
    }
  }

  /**
   * 関数がCA Casherでサポートされているかチェック
   */
  isSupported(method: string): boolean {
    return method in CA_CASHER_SUPPORTED_FUNCTIONS;
  }

  /**
   * CA Casherから関数を呼び出し
   */
  async call(method: string, params: any[] = []): Promise<any> {
    const functionInfo = CA_CASHER_SUPPORTED_FUNCTIONS[method as keyof typeof CA_CASHER_SUPPORTED_FUNCTIONS];
    if (!functionInfo) {
      throw new Error(`Function ${method} not supported by CA Casher`);
    }

    // パラメータをクエリストリングに変換
    const queryParams = new URLSearchParams();
    functionInfo.params.forEach((paramName, index) => {
      if (params[index] !== undefined) {
        queryParams.append(paramName, params[index].toString());
      }
    });

    const queryString = queryParams.toString();
    const url = `${this.baseUrl}/contract/${this.contractAddress}/${method}${queryString ? `?${queryString}` : ''}`;

    console.log(`🔄 CA Casher request: ${method}(${params.join(', ')})`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: CACasherError;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        throw new Error(`CA Casher HTTP error: ${response.status} ${response.statusText}`);
      }
      throw new Error(`CA Casher error: ${errorData.error} - ${errorData.message}`);
    }

    const data: CACasherResponse = await response.json();
    
    if (data.cached) {
      console.log(`✅ CA Casher cache hit: ${method} (cached at ${data.cachedAt})`);
    } else {
      console.log(`🆕 CA Casher cache miss: ${method}`);
    }

    return data.result;
  }

}

/**
 * キャッシュ対応ラッパー関数
 * CA Casherを優先し、失敗時は直接実行にフォールバック
 */
export async function withCACasher<T>(
  contractAddress: string,
  method: string,
  params: any[],
  fallbackFn: () => Promise<T>
): Promise<T> {
  // キャッシュが無効な場合は直接実行
  if (!isCACasherEnabled()) {
    console.log(`🔄 CA Casher disabled, using direct RPC: ${method}(${params.join(', ')})`);
    return await fallbackFn();
  }

  const client = new CACasherClient(contractAddress);
  
  // CA Casherが対応していない関数は直接実行
  if (!client.isSupported(method)) {
    console.log(`🔄 CA Casher unsupported function, using direct RPC: ${method}(${params.join(', ')})`);
    return await fallbackFn();
  }

  try {
    // CA Casherを試行
    const result = await client.call(method, params);
    return result as T;
  } catch (error) {
    console.warn(`⚠️ CA Casher failed for ${method}, falling back to direct RPC:`, error);
    // フォールバック: 直接実行
    return await fallbackFn();
  }
}

// デフォルトのCA Casherクライアントインスタンス
export const caCasherClient = new CACasherClient(CONTRACT_ADDRESS);