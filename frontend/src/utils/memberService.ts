import { ethers } from "ethers";
import type { MemberInfo } from "../types";

const MEMBER_API_BASE_URL = "https://ehfm6q914a.execute-api.ap-northeast-1.amazonaws.com/member";

export class MemberService {
  /**
   * 指定されたEOAアドレスのメンバー情報を取得
   */
  async getMemberInfo(address: string): Promise<MemberInfo | null> {
    try {
        console.log(`🌐 API CALL: getMemberInfo for ${address}`);
        console.log(`🔍 Original address: ${address}`);
        console.log(`🔍 Lowercase address: ${address.toLowerCase()}`);
        console.log(`🔍 Checksum address: ${this.toChecksumAddress(address)}`);
        
        // チェックサム形式のアドレスを試行（まず元のアドレスで試す）
        const addressesToTry = [
          address,
          address.toLowerCase(),
          this.toChecksumAddress(address),
        ];
        
        // 重複を除去
        const uniqueAddresses = [...new Set(addressesToTry)];
        
        for (const addr of uniqueAddresses) {
          console.log(`🔍 Trying address: ${addr}`);
          const response = await fetch(`${MEMBER_API_BASE_URL}/${addr}`);
          
          console.log(`📡 API Response status: ${response.status} for ${addr}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`📋 Raw API response for ${addr}:`, data);
            
            // APIからのレスポンスが "member not found" の場合は次のアドレスを試す
            if (typeof data === 'object' && data?.message === 'member not found') {
              console.log(`📋 Member not found in response for ${addr}, trying next address...`);
              continue;
            }

            console.log(`✅ Member info retrieved for ${addr}:`, data);
            console.log(`📋 Data keys:`, Object.keys(data));
            console.log(`📋 Icon/avatar:`, data.Icon || data.avatar_url);
            console.log(`📋 Name fields:`, {
              Nick: data.Nick,
              Name: data.Name,
              Username: data.Username,
              nickname: data.nickname,
              username: data.username
            });
            
            return {
              address: address, // 元のアドレスを保持
              ...data
            } as MemberInfo;
          } else if (response.status === 404) {
            console.log(`📋 Member not found (404) for ${addr}, trying next address...`);
            continue;
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }
        
        // すべてのアドレス形式で見つからなかった場合
        console.log(`📋 Member not found in any address format for: ${address}`);
        return null;
    } catch (error) {
      console.error(`❌ Failed to fetch member info for ${address}:`, error);
      return null;
    }
  }

  /**
   * 複数のアドレスのメンバー情報を一括取得
   */
  async getMemberInfoBatch(addresses: string[]): Promise<Record<string, MemberInfo | null>> {
    const results: Record<string, MemberInfo | null> = {};
    
    // 並列でAPIリクエストを実行（レート制限を考慮して小さなバッチサイズ）
    const batchSize = 3;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (address) => {
        const memberInfo = await this.getMemberInfo(address);
        return { address, memberInfo };
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(({ address, memberInfo }) => {
        results[address] = memberInfo;
      });
      
      // 次のバッチまで少し待機
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * アドレスをEIP-55チェックサム形式に変換
   */
  private toChecksumAddress(address: string): string {
    try {
      return ethers.getAddress(address);
    } catch {
      // ethers.jsで変換できない場合はそのまま返す
      return address;
    }
  }
}

// シングルトンインスタンス
export const memberService = new MemberService();