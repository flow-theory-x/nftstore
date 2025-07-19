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
        
        // 環境変数で指定されたAPIを使用
        return await this.getMemberInfoFromAPI(address);
    } catch (error) {
      console.error(`❌ Failed to fetch member info for ${address}:`, error);
      return null;
    }
  }
  
  /**
   * APIからメンバー情報を取得
   */
  private async getMemberInfoFromAPI(address: string): Promise<MemberInfo | null> {
    try {
      const addressesToTry = [
        address,
        address.toLowerCase(),
        this.toChecksumAddress(address),
      ];
      
      const uniqueAddresses = [...new Set(addressesToTry)];
      
      for (const addr of uniqueAddresses) {
        console.log(`🔍 Trying address: ${addr}`);
        
        try {
          const response = await fetch(`${MEMBER_API_BASE_URL}/discord/eoa/${addr}`, {
            credentials: 'omit',
            cache: 'no-cache'
          });
          
          console.log(`📡 API Response status: ${response.status} for ${addr}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`📋 Raw API response for ${addr}:`, data);
            
            // レスポンス内容で判定
            if (data.success === true && data.discord_member) {
              // 正常なメンバー情報
              const mapped = this.mapAPIResponse(address, data);
              console.log(`✅ Member info mapped from API:`, mapped);
              return mapped;
            } else if (data.success === false) {
              // エラーレスポンスの処理
              if (data.error === "Member not found" || data.error === "member not found") {
                console.info(`ℹ️ Member not found for ${addr} - this is normal for unregistered addresses`);
                continue;
              } else if (data.error === "Discord service unavailable" || data.error === "Discord user not found") {
                // Discord退会済みユーザー
                console.info(`ℹ️ Discord user left server for ${addr} - ${data.error}`);
                
                if (data.discord_id || data.eoa_address) {
                  console.info(`ℹ️ Creating member info for Discord left user: ${addr}`);
                  const partialMemberInfo: MemberInfo = {
                    address: address,
                    DeleteFlag: false,
                    DiscordId: data.discord_id || '',
                    Icon: '',
                    Roles: [],
                    Expired: 'EMPTY',
                    Eoa: data.eoa_address || address,
                    Nick: `退会済みユーザー`,
                    PartitionName: 'EMPTY',
                    Updated: 'EMPTY',
                    Name: `退会済みユーザー`,
                    Username: '',
                    name: `退会済みユーザー`,
                    email: 'EMPTY',
                    role: '',
                    joinedAt: '',
                    joined_at: '',
                    status: 'left_discord',
                    deleted: false,
                    discord_id: data.discord_id || '',
                    avatar_url: '',
                    nickname: '',
                    username: '',
                    roles: [],
                    expires_at: 'EMPTY',
                    updated_at: 'EMPTY',
                  };
                  return partialMemberInfo;
                }
                continue;
              } else {
                console.warn(`⚠️ Unknown error from API for ${addr}:`, data);
                continue;
              }
            } else {
              // 予期しないレスポンス形式
              console.warn(`⚠️ Unexpected response format for ${addr}:`, data);
              continue;
            }
          } else {
            // 200以外のHTTPステータス（API側修正後は基本的に発生しないはず）
            console.warn(`⚠️ Non-200 status ${response.status} for ${addr}`);
            continue;
          }
        } catch (fetchError) {
          console.info(`ℹ️ Could not fetch member info for ${addr} - this is normal for unregistered addresses`);
          continue;
        }
      }
      
      console.info(`ℹ️ Member not found in API for: ${address} - this is normal for unregistered addresses`);
      return null;
    } catch (error) {
      console.error(`❌ Failed to fetch from API for ${address}:`, error);
      return null;
    }
  }
  
  /**
   * APIレスポンスをMemberInfo形式にマッピング
   */
  private mapAPIResponse(address: string, data: any): MemberInfo {
    const discordMember = data.discord_member || {};
    const registrationInfo = data.registration_info || {};
    
    return {
      address: address,
      
      // API形式のフィールド（大文字）
      DeleteFlag: false, // APIには削除フラグなし -> デフォルトfalse
      DiscordId: discordMember.user_id || '',
      Icon: discordMember.avatar_url || '',
      Roles: discordMember.roles || [], // オブジェクト全体を保持
      Expired: 'EMPTY', // APIには有効期限なし
      Eoa: data.eoa_address || address,
      Nick: discordMember.display_name || discordMember.username || '',
      PartitionName: 'EMPTY', // APIにはパーティション名なし
      Updated: 'EMPTY', // APIには更新日時なし
      Name: discordMember.display_name || discordMember.username || '',
      Username: discordMember.username || '',
      
      // レガシーフィールド（小文字）
      name: discordMember.display_name || discordMember.username || '',
      email: 'EMPTY', // APIにはメールなし
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