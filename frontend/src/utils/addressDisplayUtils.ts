import type { MemberInfo, TBAInfo, AddressNameInfo } from '../types';

export class AddressDisplayUtils {
  static formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  static getDisplayName(addressInfo: AddressNameInfo): string {
    const { memberInfo, tbaInfo, creatorName, address } = addressInfo;

    if (creatorName) {
      return creatorName;
    }

    if (tbaInfo?.isTBA && tbaInfo.tbaName) {
      return tbaInfo.tbaName;
    }

    if (memberInfo) {
      return this.getPriorityName(memberInfo, address);
    }

    return this.formatAddress(address);
  }

  static getPriorityName(memberInfo: MemberInfo, fallbackAddress: string): string {
    return (
      memberInfo.Nick ||
      memberInfo.nickname ||
      memberInfo.Name ||
      memberInfo.name ||
      memberInfo.Username ||
      memberInfo.username ||
      this.formatAddress(fallbackAddress)
    );
  }

  static getDisplayNameFromParts(
    creatorName?: string,
    memberInfo?: MemberInfo | null,
    tbaInfo?: TBAInfo,
    address = ''
  ): string {
    if (creatorName) {
      return creatorName;
    }

    if (tbaInfo?.isTBA && tbaInfo.tbaName) {
      return tbaInfo.tbaName;
    }

    if (memberInfo) {
      return this.getPriorityName(memberInfo, address);
    }

    return this.formatAddress(address);
  }

  static getAvatarUrl(memberInfo?: MemberInfo | null, tbaImage?: string): string {
    if (tbaImage) {
      return tbaImage;
    }

    if (memberInfo) {
      return memberInfo.Icon || memberInfo.avatar_url || '';
    }

    return '';
  }

  static getRoleDisplay(memberInfo?: MemberInfo | null): string {
    if (!memberInfo) return '';

    if (Array.isArray(memberInfo.Roles) && memberInfo.Roles.length > 0) {
      return memberInfo.Roles.join(', ');
    }

    if (Array.isArray(memberInfo.roles) && memberInfo.roles.length > 0) {
      return memberInfo.roles.map(role =>
        typeof role === 'string' ? role : role?.name || 'Unknown Role'
      ).join(', ');
    }

    return memberInfo.role || '';
  }

  static getTypeDescription(
    creatorName?: string,
    tbaInfo?: TBAInfo, 
    memberInfo?: MemberInfo | null
  ): string {
    if (tbaInfo?.isTBA) {
      return 'Token Bound Account';
    }

    if (memberInfo) {
      // Discord情報があり、かつ作家名もある場合は「Creator (Discord Member)」
      if (this.isCreatorAccount(creatorName)) {
        return 'Creator (Discord Member)';
      }
      return 'Discord Member';
    }

    if (this.isCreatorAccount(creatorName)) {
      return 'Creator Account';
    }

    return 'EOA Address';
  }

  static isVerifiedMember(memberInfo?: MemberInfo | null): boolean {
    if (!memberInfo) return false;
    
    return !memberInfo.DeleteFlag && 
           !memberInfo.deleted &&
           !!memberInfo.DiscordId;
  }

  static isCreatorAccount(creatorName?: string): boolean {
    return !!(creatorName && creatorName.trim());
  }

  static getAvatarUrlWithCreator(
    creatorName?: string,
    memberInfo?: MemberInfo | null, 
    tbaImage?: string,
    creatorIconUrl?: string
  ): string {
    // TBAの場合は最優先
    if (tbaImage) {
      return tbaImage;
    }

    // Discord情報がある場合はDiscordアバターを優先（作家名があっても）
    if (memberInfo) {
      return memberInfo.Icon || memberInfo.avatar_url || '';
    }

    // Discord情報がなく、作家名のみの場合は作家アイコン
    if (this.isCreatorAccount(creatorName) && creatorIconUrl) {
      return creatorIconUrl;
    }

    return '';
  }

  static hasValidName(addressInfo: AddressNameInfo): boolean {
    const { creatorName, memberInfo, tbaInfo } = addressInfo;
    
    if (creatorName) return true;
    if (tbaInfo?.isTBA && tbaInfo.tbaName) return true;
    if (memberInfo && (
      memberInfo.Nick || 
      memberInfo.Name || 
      memberInfo.Username ||
      memberInfo.nickname ||
      memberInfo.name ||
      memberInfo.username
    )) return true;
    
    return false;
  }

  static getDetailedInfo(addressInfo: AddressNameInfo): {
    primaryName: string;
    secondaryName?: string;
    avatar?: string;
    type: string;
    isVerified: boolean;
    roles?: string;
  } {
    const { creatorName, memberInfo, tbaInfo, address } = addressInfo;

    let primaryName = this.getDisplayName(addressInfo);
    let secondaryName: string | undefined;
    let avatar: string | undefined;
    let type: string;
    let isVerified = false;
    let roles: string | undefined;

    if (tbaInfo?.isTBA) {
      secondaryName = this.formatAddress(address);
      avatar = tbaInfo.tbaImage || undefined;
      type = 'Token Bound Account';
      isVerified = true;
    } else if (memberInfo) {
      secondaryName = this.formatAddress(address);
      avatar = this.getAvatarUrl(memberInfo);
      isVerified = this.isVerifiedMember(memberInfo);
      roles = this.getRoleDisplay(memberInfo);
      
      // Discord情報があり、かつ作家名もある場合
      if (creatorName) {
        type = 'Creator (Discord Member)';
      } else {
        type = 'Discord Member';
      }
    } else if (creatorName) {
      secondaryName = this.formatAddress(address);
      avatar = '/assets/icons/creator.svg'; // 作家アイコンのパス
      type = 'Creator Account';
      isVerified = true;
    } else {
      type = 'EOA Address';
      isVerified = false;
    }

    return {
      primaryName,
      secondaryName,
      avatar,
      type,
      isVerified,
      roles: roles || undefined
    };
  }

  static sortByPriority(addressInfos: AddressNameInfo[]): AddressNameInfo[] {
    return addressInfos.sort((a, b) => {
      const aScore = this.getAddressPriorityScore(a);
      const bScore = this.getAddressPriorityScore(b);
      return bScore - aScore;
    });
  }

  private static getAddressPriorityScore(addressInfo: AddressNameInfo): number {
    let score = 0;

    if (addressInfo.creatorName) score += 100;
    if (addressInfo.tbaInfo?.isTBA) score += 50;
    if (addressInfo.memberInfo) {
      score += 25;
      if (this.isVerifiedMember(addressInfo.memberInfo)) score += 10;
    }

    return score;
  }
}