import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WalletService } from '../utils/wallet';
import type { WalletState } from '../types';

const walletService = new WalletService();

export const useWallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    console.log('📝 Updating wallet state:', newState);
    setWalletState(newState);
    // Save to localStorage with error handling
    try {
      localStorage.setItem('wallet-state', JSON.stringify(newState));
    } catch (error: any) {
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn('LocalStorage quota exceeded when saving wallet state');
        // Try to free up space by removing some items
        try {
          // Clear some localStorage items to make space
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('temp_')) {
              localStorage.removeItem(key);
              break;
            }
          }
          localStorage.setItem('wallet-state', JSON.stringify(newState));
        } catch (retryError) {
          console.error('Failed to save wallet state even after cleanup:', retryError);
        }
      } else {
        console.error('Failed to save wallet state:', error);
      }
    }
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
      console.log('🔗 Wallet connected:', { address, chainId });
      updateWalletState({
        isConnected: true,
        address,
        chainId,
      });
      console.log('🔗 Wallet state updated after connection');
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
    console.log('🔌 Disconnecting wallet');
    updateWalletState({
      isConnected: false,
      address: null,
      chainId: null,
    });
    walletService.removeAllListeners();
    // Clear localStorage
    localStorage.removeItem('wallet-state');
    console.log('🔌 Wallet disconnected');
  }, [updateWalletState]);

  const getSigner = useCallback(() => {
    return walletService.getSigner();
  }, []);

  const handleWalletSwitch = useCallback((oldAddress: string, newAddress: string) => {
    const currentPath = location.pathname;
    console.log(`🔄 Handling wallet switch on path: ${currentPath}`);
    
    // Own ページ（/own/address）にいる場合、新しいアドレスにリダイレクト
    if (currentPath.startsWith('/own/')) {
      const pathParts = currentPath.split('/');
      if (pathParts.length >= 3) {
        const addressInPath = pathParts[2];
        
        // パスのアドレスが旧アドレスと一致する場合、新しいアドレスにリダイレクト
        if (addressInPath.toLowerCase() === oldAddress.toLowerCase()) {
          const newPath = `/own/${newAddress}`;
          console.log(`🔄 Redirecting from ${currentPath} to ${newPath}`);
          navigate(newPath, { replace: true });
          return;
        }
      }
    }
    
    // Creator ページ（/creator/address）にいる場合の処理
    if (currentPath.startsWith('/creator/')) {
      const pathParts = currentPath.split('/');
      if (pathParts.length >= 3) {
        const addressInPath = pathParts[2];
        
        // パスのアドレスが旧アドレスと一致する場合、新しいアドレスにリダイレクト
        if (addressInPath.toLowerCase() === oldAddress.toLowerCase()) {
          const newPath = `/creator/${newAddress}`;
          console.log(`🔄 Redirecting from ${currentPath} to ${newPath}`);
          navigate(newPath, { replace: true });
          return;
        }
      }
    }
    
    // その他のページでは特別な処理は行わず、ナビゲーション更新のみ
    console.log(`ℹ️ Wallet switched but no redirect needed for path: ${currentPath}`);
  }, [location.pathname, navigate]);

  useEffect(() => {
    // Only check connection if we have a saved wallet state that indicates connection
    const savedState = walletState.isConnected;
    if (savedState) {
      checkConnection();
    }

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 Accounts changed:', accounts);
      if (accounts.length === 0) {
        console.log('🔌 Disconnecting wallet - no accounts');
        disconnectWallet();
      } else {
        const oldAddress = walletState.address;
        const newAddress = accounts[0];
        
        console.log(`🔄 Account change: ${oldAddress} -> ${newAddress}`);
        
        setWalletState(prev => {
          const newState = {
            ...prev,
            isConnected: true,
            address: newAddress,
          };
          
          // ウォレットアドレスが変更された場合の処理
          if (oldAddress && newAddress && oldAddress.toLowerCase() !== newAddress.toLowerCase()) {
            console.log(`🔄 Wallet switched from ${oldAddress} to ${newAddress}`);
            handleWalletSwitch(oldAddress, newAddress);
          }
          
          return newState;
        });
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
    handleWalletSwitch,
  };
};