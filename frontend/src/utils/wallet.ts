import { ethers } from 'ethers';
import { CHAIN_ID, CHAIN_NAME, RPC_URL, CURRENCY_NAME, CURRENCY_SYMBOL } from '../constants';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  async connectWallet(): Promise<{ address: string; chainId: number }> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);

      if (chainId !== CHAIN_ID) {
        await this.switchToPolygon();
      }

      return {
        address: accounts[0],
        chainId: chainId,
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  async switchToPolygon(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${CHAIN_ID.toString(16)}`,
              chainName: CHAIN_NAME,
              nativeCurrency: {
                name: CURRENCY_NAME,
                symbol: CURRENCY_SYMBOL,
                decimals: 18,
              },
              rpcUrls: [RPC_URL],
              blockExplorerUrls: ['https://polygonscan.com/'],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  async getConnectedAccount(): Promise<string | null> {
    if (!window.ethereum) {
      return null;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });
      return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Failed to get connected account:', error);
      return null;
    }
  }

  getSigner(): ethers.JsonRpcSigner | null {
    return this.signer;
  }

  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', callback);
    }
  }

  onChainChanged(callback: (chainId: string) => void): void {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  removeAllListeners(): void {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  }
}