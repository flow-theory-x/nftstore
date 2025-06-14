import { useState, useEffect, useCallback } from 'react';
import { WalletService } from '../utils/wallet';
import type { WalletState } from '../types';

const walletService = new WalletService();

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const address = await walletService.getConnectedAccount();
      if (address) {
        const provider = walletService.getProvider();
        if (provider) {
          const network = await provider.getNetwork();
          setWalletState({
            isConnected: true,
            address,
            chainId: Number(network.chainId),
          });
        }
      }
    } catch (error) {
      console.error('Failed to check connection:', error);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { address, chainId } = await walletService.connectWallet();
      setWalletState({
        isConnected: true,
        address,
        chainId,
      });
      return { address, chainId };
    } catch (error: any) {
      setError(error.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const disconnectWallet = useCallback(() => {
    setWalletState({
      isConnected: false,
      address: null,
      chainId: null,
    });
    walletService.removeAllListeners();
  }, []);

  const getSigner = useCallback(() => {
    return walletService.getSigner();
  }, []);

  useEffect(() => {
    checkConnection();

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setWalletState(prev => ({
          ...prev,
          address: accounts[0],
        }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      setWalletState(prev => ({
        ...prev,
        chainId: parseInt(chainId, 16),
      }));
    };

    walletService.onAccountsChanged(handleAccountsChanged);
    walletService.onChainChanged(handleChainChanged);

    return () => {
      walletService.removeAllListeners();
    };
  }, [checkConnection, disconnectWallet]);

  return {
    walletState,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    getSigner,
  };
};