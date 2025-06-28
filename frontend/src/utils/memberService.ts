import { ethers } from "ethers";
import type { MemberInfo } from "../types";
import { MEMBER_API_BASE_URL } from "../constants";

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
        
        // 新旧APIの判定
        const isNewAPI = MEMBER_API_BASE_URL.includes('web3.bon-soleil.com');
        
        if (isNewAPI) {
          // 新API用の処理
          return await this.getMemberInfoFromNewAPI(address);
        }
        
        // 旧API用の処理（既存のコード）
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
            console.info(`ℹ️ Member not found (404) for ${addr} - trying next address format...`);
            continue;
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }
        
        // すべてのアドレス形式で見つからなかった場合
        console.info(`ℹ️ Member not found in any address format for: ${address} - this is normal for unregistered addresses`);
        return null;
    } catch (error) {
      console.error(`❌ Failed to fetch member info for ${address}:`, error);
      return null;
    }
  }
  
  /**
   * 新API用のメンバー情報取得
   */
  private async getMemberInfoFromNewAPI(address: string): Promise<MemberInfo | null> {
    try {
      const addressesToTry = [
        address,
        address.toLowerCase(),
        this.toChecksumAddress(address),
      ];
      
      const uniqueAddresses = [...new Set(addressesToTry)];
      
      for (const addr of uniqueAddresses) {
        console.log(`🔍 Trying address with new API: ${addr}`);
        
        try {
          const response = await fetch(`${MEMBER_API_BASE_URL}/discord/eoa/${addr}`, {
            credentials: 'omit',
            cache: 'no-cache'
          });
          
          console.log(`📡 New API Response status: ${response.status} for ${addr}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`📋 Raw new API response for ${addr}:`, data);
            
            // 新APIからのレスポンスをマッピング
            if (data.discord_member) {
              const mapped = this.mapNewAPIResponse(address, data);
              console.log(`✅ Member info mapped from new API:`, mapped);
              return mapped;
            }
          } else if (response.status === 404) {
            console.info(`ℹ️ Member not found in new API (404) for ${addr} - this is normal for unregistered addresses`);
            continue;
          } else if (response.status === 503) {
            // 503エラーの場合、レスポンスボディを確認して部分的な情報があれば利用
            console.warn(`⚠️ Discord service temporarily unavailable (503) for ${addr}`);
            
            try {
              const errorData = await response.json();
              console.warn(`📋 503 Response body:`, errorData);
              
              // Discord IDやEOAアドレスが含まれている場合は部分的なMemberInfoを作成
              if (errorData.discord_id || errorData.eoa_address) {
                console.info(`ℹ️ Creating partial member info from 503 response for ${addr}`);
                const partialMemberInfo: MemberInfo = {
                  address: address,
                  DeleteFlag: false,
                  DiscordId: errorData.discord_id || '',
                  Icon: '',
                  Roles: [],
                  Expired: 'EMPTY',
                  Eoa: errorData.eoa_address || address,
                  Nick: `User (Discord unavailable)`,
                  PartitionName: 'EMPTY',
                  Updated: 'EMPTY',
                  Name: `User (Discord unavailable)`,
                  Username: '',
                  name: `User (Discord unavailable)`,
                  email: 'EMPTY',
                  role: '',
                  joinedAt: '',
                  joined_at: '',
                  status: 'discord_unavailable',
                  deleted: false,
                  discord_id: errorData.discord_id || '',
                  avatar_url: '',
                  nickname: '',
                  username: '',
                  roles: [],
                  expires_at: 'EMPTY',
                  updated_at: 'EMPTY',
                };
                return partialMemberInfo;
              }
            } catch (jsonError) {
              console.warn(`📋 Could not parse 503 response as JSON:`, jsonError);
            }
            continue;
          }
        } catch (fetchError) {
          console.info(`ℹ️ Could not fetch member info for ${addr} - this is normal for unregistered addresses`);
          continue;
        }
      }
      
      console.info(`ℹ️ Member not found in new API for: ${address} - this is normal for unregistered addresses`);
      return null;
    } catch (error) {
      console.error(`❌ Failed to fetch from new API for ${address}:`, error);
      return null;
    }
  }
  
  /**
   * 新APIレスポンスを既存のMemberInfo形式にマッピング
   */
  private mapNewAPIResponse(address: string, data: any): MemberInfo {
    const discordMember = data.discord_member || {};
    const registrationInfo = data.registration_info || {};
    
    return {
      address: address,
      
      // 新API形式のフィールド（大文字）
      DeleteFlag: false, // 新APIには削除フラグなし -> デフォルトfalse
      DiscordId: discordMember.user_id || '',
      Icon: discordMember.avatar_url || '',
      Roles: discordMember.roles || [], // オブジェクト全体を保持
      Expired: 'EMPTY', // 新APIには有効期限なし
      Eoa: data.eoa_address || address,
      Nick: discordMember.display_name || discordMember.username || '',
      PartitionName: 'EMPTY', // 新APIにはパーティション名なし
      Updated: 'EMPTY', // 新APIには更新日時なし
      Name: discordMember.display_name || discordMember.username || '',
      Username: discordMember.username || '',
      
      // レガシーフィールド（小文字）
      name: discordMember.display_name || discordMember.username || '',
      email: 'EMPTY', // 新APIにはメールなし
      role: discordMember.roles?.[0]?.name || '',
      joinedAt: discordMember.joined_at || '',
      joined_at: discordMember.joined_at || '',
      status: registrationInfo.verified ? 'active' : 'pending',
      deleted: false,
      discord_id: discordMember.user_id || '',
      avatar_url: discordMember.avatar_url || '',
      nickname: discordMember.display_name || '',
      username: discordMember.username || '',
      roles: discordMember.roles || [],
      expires_at: 'EMPTY',
      updated_at: 'EMPTY',
    };
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