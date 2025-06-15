import { useState, useEffect, useCallback } from 'react';
import { WalletService } from '../utils/wallet';
import type { WalletState } from '../types';

const walletService = new WalletService();

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>(() => {
    // Try to restore from localStorage on initial load
    const saved = localStorage.getItem('wallet-state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved wallet state:', e);
      }
    }
    return {
      isConnected: false,
      address: null,
      chainId: null,
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateWalletState = useCallback((newState: WalletState) => {
    setWalletState(newState);
    // Save to localStorage
    localStorage.setItem('wallet-state', JSON.stringify(newState));
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const address = await walletService.getConnectedAccount();
      if (address) {
        // Re-initialize provider and signer for the connected account
        if (window.ethereum) {
          const provider = new (await import('ethers')).ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          (walletService as any).provider = provider;
          (walletService as any).signer = signer;
          
          const network = await provider.getNetwork();
          updateWalletState({
            isConnected: true,
            address,
            chainId: Number(network.chainId),
          });
        }
      } else {
        // If no account is connected, clear the saved state
        updateWalletState({
          isConnected: false,
          address: null,
          chainId: null,
        });
      }
    } catch (error) {
      console.error('Failed to check connection:', error);
      // Clear saved state on error
      updateWalletState({
        isConnected: false,
        address: null,
        chainId: null,
      });
    }
  }, [updateWalletState]);

  const connectWallet = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { address, chainId } = await walletService.connectWallet();
      updateWalletState({
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
  }, [isLoading, updateWalletState]);

  const disconnectWallet = useCallback(() => {
    updateWalletState({
      isConnected: false,
      address: null,
      chainId: null,
    });
    walletService.removeAllListeners();
    // Clear localStorage
    localStorage.removeItem('wallet-state');
  }, [updateWalletState]);

  const getSigner = useCallback(() => {
    return walletService.getSigner();
  }, []);

  useEffect(() => {
    // Only check connection if we have a saved wallet state that indicates connection
    const savedState = walletState.isConnected;
    if (savedState) {
      checkConnection();
    }

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setWalletState(prev => {
          const newState = {
            ...prev,
            address: accounts[0],
          };
          localStorage.setItem('wallet-state', JSON.stringify(newState));
          return newState;
        });
      }
    };

    const handleChainChanged = (chainId: string) => {
      setWalletState(prev => {
        const newState = {
          ...prev,
          chainId: parseInt(chainId, 16),
        };
        localStorage.setItem('wallet-state', JSON.stringify(newState));
        return newState;
      });
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