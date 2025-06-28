import { ethers } from "ethers";
import {
  RPC_URL,
  TBA_REGISTRY_ADDRESS,
  TBA_ACCOUNT_IMPLEMENTATION,
  TBA_DEFAULT_SALT,
  CHAIN_ID,
  DEAD_ADDRESS,
  CONTRACT_ADDRESS,
} from "../constants";
import tbaRegistryAbi from "../../config/tba_registry_abi.json";
import tbaAccountAbi from "../../config/tba_account_abi.json";
import { NftContractService } from "./nftContract";
import type { NFTToken } from "../types";
import { withCACasher } from "./caCasherClient";

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
      const accountAddress = await withCACasher(
        TBA_REGISTRY_ADDRESS,
        'account',
        [implementation, chainId.toString(), tokenContract, tokenId, salt],
        async () => await (this.registryContract as any).account(
          implementation,
          chainId,
          tokenContract,
          tokenId,
          salt
        )
      );
      return accountAddress;
    } catch (error) {
      console.error("Failed to compute account address:", error);
      throw error;
    }
  }

  // getBalance（キャッシュなし）
  private async getCachedBalance(address: string): Promise<bigint> {
    console.log(`🔄 Fetching balance for ${address}`);
    const balance = await this.provider.getBalance(address);
    return balance;
  }

  // TBAアカウントがデプロイされているかチェック
  async isAccountDeployed(accountAddress: string): Promise<boolean> {
    try {
      console.log(`🔄 Fetching code for ${accountAddress}`);
      const code = await this.provider.getCode(accountAddress);
      return code !== "0x";
    } catch (error) {
      console.error("Failed to check if account is deployed:", error);
      return false;
    }
  }

  // TBAアカウントを作成
  async createAccount(
    implementation: string,
    salt: string,
    chainId: number,
    tokenContract: string,
    tokenId: string,
    signer: ethers.JsonRpcSigner
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const contractWithSigner = this.registryContract.connect(signer);
      const tx = await (contractWithSigner as any).createAccount(
        implementation,
        chainId,
        tokenContract,
        tokenId,
        salt,
        "0x" // initData (empty bytes)
      );
      return tx;
    } catch (error) {
      console.error("Failed to create TBA account:", error);
      throw error;
    }
  }

  // デフォルトTBAアカウント情報を取得
  async getDefaultTBAInfo(
    contractAddress: string,
    tokenId: string
  ): Promise<TBAAccountInfo> {
    try {
      // Try different salt values to find the correct TBA address
      // Start with the configured default salt value
      const saltValues = Array.from(new Set([
        TBA_DEFAULT_SALT, 
        "0", 
        "1", 
        ethers.keccak256(ethers.toUtf8Bytes(""))
      ]));
      
      for (const salt of saltValues) {
        const accountAddress = await this.computeAccountAddress(
          TBA_ACCOUNT_IMPLEMENTATION,
          salt,
          CHAIN_ID,
          contractAddress,
          tokenId
        );

        const isDeployed = await this.isAccountDeployed(accountAddress);
        
        if (isDeployed) {
          const balance = await this.getCachedBalance(accountAddress);
          return {
            accountAddress,
            isDeployed,
            balance: ethers.formatEther(balance),
          };
        }
      }

      // If no deployed account found, return the default salt attempt
      const accountAddress = await this.computeAccountAddress(
        TBA_ACCOUNT_IMPLEMENTATION,
        TBA_DEFAULT_SALT,
        CHAIN_ID,
        contractAddress,
        tokenId
      );
      
      const balance = await this.getCachedBalance(accountAddress);

      return {
        accountAddress,
        isDeployed: false,
        balance: ethers.formatEther(balance),
      };
    } catch (error) {
      console.error("Failed to get default TBA info:", error);
      throw error;
    }
  }

  // TBAアカウントの残高を取得
  async getAccountBalance(accountAddress: string): Promise<string> {
    try {
      const balance = await this.getCachedBalance(accountAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Failed to get account balance:", error);
      throw error;
    }
  }

  // TBAアカウントが所有するNFTを取得
  async getOwnedTokens(
    accountAddress: string,
    contractAddress: string
  ): Promise<string[]> {
    try {
      const nftService = new NftContractService(contractAddress);
      const tokenIds = await nftService.getTokensByOwner(accountAddress);
      return tokenIds;
    } catch (error) {
      console.error("Failed to get owned tokens:", error);
      return [];
    }
  }

  // TBAアカウントが所有するNFTの詳細情報を取得
  async getOwnedTokensWithMetadata(
    accountAddress: string,
    contractAddress: string
  ): Promise<NFTToken[]> {
    try {
      const tokenIds = await this.getOwnedTokens(accountAddress, contractAddress);
      const nftService = new NftContractService(contractAddress);
      return await nftService.getTokensWithMetadata(tokenIds);
    } catch (error) {
      console.error("Failed to get owned tokens with metadata:", error);
      return [];
    }
  }

  // TBAアカウントからEtherを送金
  async transferEther(
    accountAddress: string,
    to: string,
    amount: string,
    signer: ethers.JsonRpcSigner
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const accountContract = new ethers.Contract(
        accountAddress,
        tbaAccountAbi,
        signer
      );

      const amountWei = ethers.parseEther(amount);
      const tx = await (accountContract as any).execute(
        to,
        amountWei,
        "0x",
        0 // CALL operation
      );

      return tx;
    } catch (error) {
      console.error("Failed to transfer ether from TBA:", error);
      throw error;
    }
  }

  // TBAアカウントからNFTを転送
  async transferNFT(
    accountAddress: string,
    nftContract: string,
    to: string,
    tokenId: string,
    signer: ethers.JsonRpcSigner
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const accountContract = new ethers.Contract(
        accountAddress,
        tbaAccountAbi,
        signer
      );

      // ERC721のtransferFromのエンコード
      const nftContractInterface = new ethers.Interface([
        "function transferFrom(address from, address to, uint256 tokenId)",
      ]);
      const data = nftContractInterface.encodeFunctionData("transferFrom", [
        accountAddress,
        to,
        tokenId,
      ]);

      const tx = await (accountContract as any).execute(
        nftContract,
        0,
        data,
        0 // CALL operation
      );

      return tx;
    } catch (error) {
      console.error("Failed to transfer NFT from TBA:", error);
      throw error;
    }
  }

  // TBAアカウントのオーナー（親NFT）を取得
  async getOwner(accountAddress: string): Promise<string> {
    try {
      const accountContract = new ethers.Contract(
        accountAddress,
        tbaAccountAbi,
        this.provider
      );

      const owner = await (accountContract as any).owner();
      return owner;
    } catch (error) {
      console.error("Failed to get TBA owner:", error);
      throw error;
    }
  }

  // TBAアカウントのtoken情報を取得
  async getToken(accountAddress: string): Promise<{
    chainId: number;
    tokenContract: string;
    tokenId: string;
  }> {
    try {
      const accountContract = new ethers.Contract(
        accountAddress,
        tbaAccountAbi,
        this.provider
      );

      const token = await (accountContract as any).token();
      // token() returns [chainId, tokenContract, tokenId]
      if (!token || token.length < 3) {
        throw new Error('Invalid token response from TBA account');
      }
      
      return {
        chainId: Number(token[0]),
        tokenContract: token[1],
        tokenId: token[2].toString(),
      };
    } catch (error) {
      console.error("Failed to get TBA token info:", error);
      throw error;
    }
  }

  // TBAアカウントの状態を取得
  async getState(accountAddress: string): Promise<number> {
    try {
      const accountContract = new ethers.Contract(
        accountAddress,
        tbaAccountAbi,
        this.provider
      );

      const state = await (accountContract as any).state();
      return Number(state);
    } catch (error) {
      console.error("Failed to get TBA state:", error);
      throw error;
    }
  }

  // アドレスがTBAアカウントかどうかをチェック
  async isTBAAccount(address: string): Promise<boolean> {
    try {
      console.log(`🔄 Fetching code for TBA check ${address}`);
      const code = await this.provider.getCode(address);
      
      if (code === "0x") return false;

      try {
        const accountContract = new ethers.Contract(
          address,
          tbaAccountAbi,
          this.provider
        );
        
        // TBAアカウントのtoken()メソッドを呼び出してみる
        await (accountContract as any).token();
        return true;
      } catch {
        return false;
      }
    } catch (error) {
      console.error("Failed to check if address is TBA:", error);
      return false;
    }
  }

  // 特定のNFTに関連するTBAアカウントのソース情報を取得
  async getTBASourceForNFT(
    contractAddress: string,
    tokenId: string
  ): Promise<{
    contractAddress: string;
    tokenId: string;
    accountAddress: string;
    isDeployed: boolean;
  } | null> {
    try {
      const accountAddress = await this.computeAccountAddress(
        TBA_ACCOUNT_IMPLEMENTATION,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        CHAIN_ID,
        contractAddress,
        tokenId
      );

      const isDeployed = await this.isAccountDeployed(accountAddress);

      return {
        contractAddress,
        tokenId,
        accountAddress,
        isDeployed,
      };
    } catch (error) {
      console.error("Failed to get TBA source for NFT:", error);
      return null;
    }
  }

  // 複数のNFTに対するTBA情報を一括取得
  async getTBAInfoForMultipleNFTs(
    tokens: Array<{ contractAddress: string; tokenId: string }>
  ): Promise<Array<{
    contractAddress: string;
    tokenId: string;
    accountAddress: string;
    isDeployed: boolean;
    balance: string;
  }>> {
    const results = [];

    for (const token of tokens) {
      try {
        const tbaInfo = await this.getDefaultTBAInfo(
          token.contractAddress,
          token.tokenId
        );

        results.push({
          contractAddress: token.contractAddress,
          tokenId: token.tokenId,
          accountAddress: tbaInfo.accountAddress,
          isDeployed: tbaInfo.isDeployed,
          balance: tbaInfo.balance,
        });
      } catch (error) {
        console.warn(
          `Failed to get TBA info for ${token.contractAddress}:${token.tokenId}:`,
          error
        );
        
        results.push({
          contractAddress: token.contractAddress,
          tokenId: token.tokenId,
          accountAddress: "",
          isDeployed: false,
          balance: "0",
        });
      }
    }

    return results;
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getRegistryContract(): ethers.Contract {
    return this.registryContract;
  }

  getRegistryAddress(): string {
    return this.registryAddress;
  }

  // Get account info (alias for getDefaultTBAInfo)
  async getAccountInfo(contractAddress: string, tokenId: string): Promise<TBAAccountInfo> {
    return this.getDefaultTBAInfo(contractAddress, tokenId);
  }

  // Create account for token (alias for createAccount with default params)
  async createAccountForToken(
    contractAddress: string,
    tokenId: string,
    signer: ethers.JsonRpcSigner
  ): Promise<ethers.ContractTransactionResponse> {
    return this.createAccount(
      TBA_ACCOUNT_IMPLEMENTATION,
      TBA_DEFAULT_SALT,
      CHAIN_ID,
      contractAddress,
      tokenId,
      signer
    );
  }

  // Find TBA source token for a given address
  async findTBASourceToken(address: string): Promise<{
    contractAddress: string;
    tokenId: string;
  } | null> {
    try {
      if (await this.isTBAAccount(address)) {
        const token = await this.getToken(address);
        return {
          contractAddress: token.tokenContract,
          tokenId: token.tokenId,
        };
      }
      return null;
    } catch (error) {
      console.error("Failed to find TBA source token:", error);
      return null;
    }
  }

  // Get TBA source NFT image (placeholder)
  async getTBASourceNFTImage(accountAddress: string): Promise<string> {
    try {
      const token = await this.getToken(accountAddress);
      const nftService = new NftContractService(token.tokenContract);
      const tokenInfo = await nftService.getTokenInfo(token.tokenId);
      return tokenInfo.image || tokenInfo.metadata?.image || "";
    } catch (error) {
      console.error("Failed to get TBA source NFT image:", error);
      return "";
    }
  }

  // Get TBA source NFT name (placeholder)
  async getTBASourceNFTName(accountAddress: string): Promise<string> {
    try {
      const token = await this.getToken(accountAddress);
      const nftService = new NftContractService(token.tokenContract);
      const tokenInfo = await nftService.getTokenInfo(token.tokenId);
      return tokenInfo.name || tokenInfo.metadata?.name || `Token #${token.tokenId}`;
    } catch (error) {
      console.error("Failed to get TBA source NFT name:", error);
      return "Unknown Token";
    }
  }
}

export const tbaService = new TbaService();