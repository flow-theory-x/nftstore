import { ethers } from "ethers";
import {
  RPC_URL,
  TBA_REGISTRY_ADDRESS,
  TBA_ACCOUNT_IMPLEMENTATION,
  CHAIN_ID,
  DEAD_ADDRESS,
  TBA_TARGET_NFT_CA_ADDRESSES,
  TBA_TARGET_SBT_CA_ADDRESSES,
} from "../constants";
import tbaRegistryAbi from "../../config/tba_registry_abi.json";
import tbaAccountAbi from "../../config/tba_account_abi.json";
import { cacheService } from "./cache";

export interface TBAAccountInfo {
  accountAddress: string;
  isDeployed: boolean;
  balance: string;
}

export class TbaService {
  private provider: ethers.JsonRpcProvider;
  private registryContract: ethers.Contract;
  private registryAddress: string;

  constructor(registryAddress?: string, signer?: ethers.JsonRpcSigner) {
    this.registryAddress = registryAddress || TBA_REGISTRY_ADDRESS;
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.registryContract = new ethers.Contract(
      this.registryAddress,
      tbaRegistryAbi,
      signer || this.provider
    );
  }

  // TBAアカウントアドレスを計算
  async computeAccountAddress(
    implementation: string,
    salt: string,
    chainId: number,
    tokenContract: string,
    tokenId: string
  ): Promise<string> {
    try {
      const cacheKey = `${implementation}_${salt}_${chainId}_${tokenContract}_${tokenId}`;
      const cached = cacheService.getContractData<string>(
        this.registryAddress,
        `account_${cacheKey}`
      );
      if (cached) {
        console.log("📋 Cache HIT: computeAccountAddress", cached);
        return cached;
      }

      console.log("🔗 Blockchain CALL: computeAccountAddress");
      const accountAddress = await (this.registryContract as any).account(
        implementation,
        chainId,
        tokenContract,
        parseInt(tokenId),
        parseInt(salt)
      );

      cacheService.setContractData(
        this.registryAddress,
        `account_${cacheKey}`,
        accountAddress
      );
      console.log("💾 Cache SET: computeAccountAddress", accountAddress);

      return accountAddress;
    } catch (error) {
      console.error("Failed to compute account address:", error);
      throw error;
    }
  }

  // TBAアカウントを作成
  async createAccount(
    implementation: string,
    chainId: number,
    tokenContract: string,
    tokenId: string,
    salt: string,
    initData: string,
    signer: ethers.JsonRpcSigner
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const contractWithSigner = this.registryContract.connect(signer);

      console.log("🔗 Blockchain CALL: createAccount");
      const tx = await (contractWithSigner as any).createAccount(
        implementation,
        chainId,
        tokenContract,
        parseInt(tokenId),
        parseInt(salt),
        initData
      );

      return tx;
    } catch (error) {
      console.error("Failed to create account:", error);
      throw error;
    }
  }

  // TBAアカウントが既にデプロイされているかチェック
  async isAccountDeployed(accountAddress: string): Promise<boolean> {
    try {
      const cached = cacheService.getContractData<boolean>(
        this.registryAddress,
        `deployed_${accountAddress}`
      );
      if (cached !== null) {
        console.log("📋 Cache HIT: isAccountDeployed", accountAddress, cached);
        return cached;
      }

      console.log("🔗 Blockchain CALL: isAccountDeployed", accountAddress);
      const code = await this.provider.getCode(accountAddress);
      const isDeployed = code !== "0x";

      // 短期間キャッシュ（デプロイ状態は変わる可能性があるため）
      cacheService.setContractData(
        this.registryAddress,
        `deployed_${accountAddress}`,
        isDeployed
      );
      console.log(
        "💾 Cache SET: isAccountDeployed",
        accountAddress,
        isDeployed
      );

      return isDeployed;
    } catch (error) {
      console.error("Failed to check if account is deployed:", error);
      throw error;
    }
  }

  // TBAアカウントの残高を取得
  async getAccountBalance(accountAddress: string): Promise<string> {
    try {
      const cached = cacheService.getContractData<string>(
        this.registryAddress,
        `balance_${accountAddress}`
      );
      if (cached) {
        console.log("📋 Cache HIT: getAccountBalance", accountAddress, cached);
        return cached;
      }

      console.log("🔗 Blockchain CALL: getAccountBalance", accountAddress);
      const balance = await this.provider.getBalance(accountAddress);
      const balanceInEther = ethers.formatEther(balance);

      // 短期間キャッシュ（残高は変わりやすいため）
      cacheService.setContractData(
        this.registryAddress,
        `balance_${accountAddress}`,
        balanceInEther
      );
      console.log(
        "💾 Cache SET: getAccountBalance",
        accountAddress,
        balanceInEther
      );

      return balanceInEther;
    } catch (error) {
      console.error("Failed to get account balance:", error);
      throw error;
    }
  }

  // TBAアカウントの情報を一括取得（デフォルトパラメータ使用）
  async getAccountInfo(
    tokenContract: string,
    tokenId: string,
    implementation: string = TBA_ACCOUNT_IMPLEMENTATION,
    salt: string = "1",
    chainId: number = CHAIN_ID
  ): Promise<TBAAccountInfo> {
    try {
      const accountAddress = await this.computeAccountAddress(
        implementation,
        salt,
        chainId,
        tokenContract,
        tokenId
      );

      const [isDeployed, balance] = await Promise.all([
        this.isAccountDeployed(accountAddress),
        this.getAccountBalance(accountAddress),
      ]);

      return {
        accountAddress,
        isDeployed,
        balance,
      };
    } catch (error) {
      console.error("Failed to get account info:", error);
      throw error;
    }
  }

  // TBAアカウントを作成（デフォルトパラメータ使用）
  async createAccountForToken(
    tokenContract: string,
    tokenId: string,
    signer: ethers.JsonRpcSigner,
    implementation: string = TBA_ACCOUNT_IMPLEMENTATION,
    salt: string = "1",
    chainId: number = CHAIN_ID,
    initData: string = "0x"
  ): Promise<ethers.ContractTransactionResponse> {
    return this.createAccount(
      implementation,
      chainId,
      tokenContract,
      tokenId,
      salt,
      initData,
      signer
    );
  }

  // TBAアカウントコントラクトインスタンスを取得
  getAccountContract(
    accountAddress: string,
    signer?: ethers.JsonRpcSigner
  ): ethers.Contract {
    return new ethers.Contract(
      accountAddress,
      tbaAccountAbi,
      signer || this.provider
    );
  }

  // TBAアカウントからトランザクションを実行
  async executeTransaction(
    accountAddress: string,
    to: string,
    value: string,
    data: string,
    operation: number,
    signer: ethers.JsonRpcSigner
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const accountContract = this.getAccountContract(accountAddress, signer);

      console.log("🔗 Blockchain CALL: executeTransaction");
      const tx = await (accountContract as any).execute(
        to,
        ethers.parseEther(value),
        data,
        operation
      );

      return tx;
    } catch (error) {
      console.error("Failed to execute transaction:", error);
      throw error;
    }
  }

  // TBAアカウントが保有するNFTを取得
  async getTBAOwnedTokens(
    accountAddress: string,
    contractAddress: string
  ): Promise<string[]> {
    try {
      const cached = cacheService.getContractData<string[]>(
        this.registryAddress,
        `tba_tokens_${accountAddress}_${contractAddress}`
      );
      if (cached) {
        console.log("📋 Cache HIT: getTBAOwnedTokens", accountAddress, cached);
        return cached;
      }

      console.log("🔗 Blockchain CALL: getTBAOwnedTokens", accountAddress);
      
      // 外部のNftContractServiceを使用してトークンを検索
      const { NftContractService } = await import("./nftContract");
      const nftService = new NftContractService(contractAddress);
      
      // 総供給量を取得
      const totalSupply = await nftService.getTotalSupply();
      const ownedTokens: string[] = [];
      
      // 各トークンの所有者をチェック（バッチ処理）
      const batchSize = 10;
      for (let i = 1; i <= totalSupply; i += batchSize) {
        const batch = Array.from(
          { length: Math.min(batchSize, totalSupply - i + 1) },
          (_, index) => i + index
        );
        
        const ownershipChecks = await Promise.allSettled(
          batch.map(async (tokenId) => {
            try {
              const owner = await nftService.getOwnerOf(tokenId.toString());
              return { tokenId: tokenId.toString(), owner };
            } catch {
              return { tokenId: tokenId.toString(), owner: null };
            }
          })
        );
        
        ownershipChecks.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.owner) {
            // BURN済み（dead addressが所有）のトークンはスキップ
            if (result.value.owner.toLowerCase() === DEAD_ADDRESS.toLowerCase()) {
              console.log(`🔥 Skipping burned token: ${result.value.tokenId} (owner: ${result.value.owner})`);
              return;
            }
            
            if (result.value.owner.toLowerCase() === accountAddress.toLowerCase()) {
              ownedTokens.push(result.value.tokenId);
            }
          }
        });
      }
      
      // 短期間キャッシュ（所有権は変わりやすいため）
      cacheService.setContractData(
        this.registryAddress,
        `tba_tokens_${accountAddress}_${contractAddress}`,
        ownedTokens,
        5 * 60 * 1000 // 5分
      );
      console.log("💾 Cache SET: getTBAOwnedTokens", accountAddress, ownedTokens);
      
      return ownedTokens;
    } catch (error) {
      console.error("Failed to get TBA owned tokens:", error);
      return [];
    }
  }

  // TBAアカウントの所有者を取得
  async getAccountOwner(accountAddress: string): Promise<string> {
    try {
      const cached = cacheService.getContractData<string>(
        this.registryAddress,
        `owner_${accountAddress}`
      );
      if (cached) {
        console.log("📋 Cache HIT: getAccountOwner", accountAddress, cached);
        return cached;
      }

      console.log("🔗 Blockchain CALL: getAccountOwner", accountAddress);
      const accountContract = this.getAccountContract(accountAddress);
      const owner = await (accountContract as any).owner();

      cacheService.setContractData(
        this.registryAddress,
        `owner_${accountAddress}`,
        owner
      );
      console.log("💾 Cache SET: getAccountOwner", accountAddress, owner);

      return owner;
    } catch (error) {
      console.error("Failed to get account owner:", error);
      throw error;
    }
  }

  // アドレスがTBAアカウントかどうかを判定
  async isTBAAccount(address: string): Promise<boolean> {
    try {
      const cached = cacheService.getContractData<boolean>(
        this.registryAddress,
        `is_tba_${address}`
      );
      if (cached !== null) {
        console.log("📋 Cache HIT: isTBAAccount", address, cached);
        return cached;
      }

      console.log("🔗 Blockchain CALL: isTBAAccount", address);
      
      // TBAアカウントであることを確認するために、owner()メソッドの呼び出しを試行
      try {
        const accountContract = this.getAccountContract(address);
        await (accountContract as any).owner();
        
        // owner()メソッドが成功した場合、これはTBAアカウント
        cacheService.setContractData(
          this.registryAddress,
          `is_tba_${address}`,
          true
        );
        console.log("💾 Cache SET: isTBAAccount", address, true);
        return true;
      } catch (error) {
        // owner()メソッドが失敗した場合、TBAアカウントではない
        cacheService.setContractData(
          this.registryAddress,
          `is_tba_${address}`,
          false
        );
        console.log("💾 Cache SET: isTBAAccount", address, false);
        return false;
      }
    } catch (error) {
      console.error("Failed to check if address is TBA:", error);
      return false;
    }
  }

  // TBAアカウントアドレスを取得（デフォルトパラメータ使用）
  async getAccountAddress(
    tokenContract: string,
    tokenId: string,
    implementation: string = TBA_ACCOUNT_IMPLEMENTATION,
    salt: string = "1",
    chainId: number = CHAIN_ID
  ): Promise<string> {
    return this.computeAccountAddress(
      implementation,
      salt,
      chainId,
      tokenContract,
      tokenId
    );
  }

  // 指定されたアドレスがどのコントラクトのTBAアカウントかを特定
  async findTBASourceToken(address: string): Promise<{contractAddress: string, tokenId: string} | null> {
    try {
      // 全てのターゲットコントラクトをチェック
      const allTargetContracts = [...TBA_TARGET_NFT_CA_ADDRESSES, ...TBA_TARGET_SBT_CA_ADDRESSES];
      
      for (const contractAddress of allTargetContracts) {
        // 各コントラクトのトークンをチェック（扩張範囲）
        for (let tokenId = 1; tokenId <= 1000; tokenId++) {
          try {
            const tbaAddress = await this.getAccountAddress(contractAddress, tokenId.toString());
            if (tbaAddress.toLowerCase() === address.toLowerCase()) {
              console.log(`🎯 Found TBA source: ${contractAddress}#${tokenId} -> ${address}`);
              return { contractAddress, tokenId: tokenId.toString() };
            }
          } catch (err) {
            // エラーは無視して続行
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error("Failed to find TBA source token:", error);
      return null;
    }
  }

  // デバッグ用: 特定のアドレスのTBAチェックを詳細に調査
  async debugTBACheck(address: string): Promise<void> {
    console.log(`🔍 Starting TBA debug check for: ${address}`);
    
    // 1. コントラクトコードチェック
    const code = await this.provider.getCode(address);
    console.log(`📄 Contract code length: ${code.length} (${code === '0x' ? 'NO CODE' : 'HAS CODE'})`);
    
    if (code !== '0x') {
      // 2. TBAメソッドチェック
      try {
        const accountContract = this.getAccountContract(address);
        const owner = await (accountContract as any).owner();
        const token = await (accountContract as any).token();
        console.log(`✅ TBA methods work - owner: ${owner}, token: ${token}`);
      } catch (error) {
        console.log(`❌ TBA methods failed:`, error);
      }
    }
    
    // 3. 既知コントラクトからの生成チェック
    const sourceToken = await this.findTBASourceToken(address);
    if (sourceToken) {
      console.log(`🎯 Found source: ${sourceToken.contractAddress}#${sourceToken.tokenId}`);
    } else {
      console.log(`❌ No source token found in known contracts`);
    }
    
    // 4. 特定のコントラクトで直接テスト
    const allTargetContracts = [...TBA_TARGET_NFT_CA_ADDRESSES, ...TBA_TARGET_SBT_CA_ADDRESSES];
    for (const contractAddress of allTargetContracts) {
      console.log(`🔍 Testing contract: ${contractAddress}`);
      for (let tokenId = 1; tokenId <= 10; tokenId++) {
        try {
          const computedTBA = await this.getAccountAddress(contractAddress, tokenId.toString());
          console.log(`  Token ${tokenId}: ${computedTBA}`);
          if (computedTBA.toLowerCase() === address.toLowerCase()) {
            console.log(`  🎯 MATCH FOUND! ${contractAddress}#${tokenId}`);
            return;
          }
        } catch (err) {
          console.log(`  Token ${tokenId}: ERROR - ${err}`);
        }
      }
    }
  }
}
