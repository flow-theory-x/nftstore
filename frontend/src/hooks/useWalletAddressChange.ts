import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from './useWallet';

interface UseWalletAddressChangeOptions {
  redirectOnAddressChange?: boolean;
  redirectPaths?: string[];
  onAddressChange?: (oldAddress: string | null, newAddress: string | null) => void;
}

export const useWalletAddressChange = ({
  redirectOnAddressChange = true,
  redirectPaths = ['/own/', '/creator/'],
  onAddressChange
}: UseWalletAddressChangeOptions = {}) => {
  const { walletState } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const previousAddressRef = useRef<string | null>(null);

  useEffect(() => {
    const currentAddress = walletState.address;
    const previousAddress = previousAddressRef.current;

    // アドレスが変更された場合の処理
    if (previousAddress !== currentAddress) {
      console.log(`🔄 Wallet address changed: ${previousAddress} -> ${currentAddress}`);

      // カスタムコールバックがある場合は実行
      if (onAddressChange) {
        onAddressChange(previousAddress, currentAddress);
      }

      // リダイレクト機能が有効で、両方のアドレスが存在する場合
      if (redirectOnAddressChange && previousAddress && currentAddress) {
        const currentPath = location.pathname;
        let shouldRedirect = false;
        let newPath = '';

        // 指定されたパスのいずれかにマッチするかチェック
        for (const redirectPath of redirectPaths) {
          if (currentPath.startsWith(redirectPath)) {
            const pathParts = currentPath.split('/');
            
            if (redirectPath === '/own/' && pathParts.length >= 3) {
              const addressInPath = pathParts[2];
              if (addressInPath.toLowerCase() === previousAddress.toLowerCase()) {
                newPath = `/own/${currentAddress}`;
                shouldRedirect = true;
                break;
              }
            }
            
            if (redirectPath === '/creator/' && pathParts.length >= 3) {
              const addressInPath = pathParts[2];
              if (addressInPath.toLowerCase() === previousAddress.toLowerCase()) {
                newPath = `/creator/${currentAddress}`;
                shouldRedirect = true;
                break;
              }
            }
          }
        }

        if (shouldRedirect && newPath) {
          console.log(`🔄 Redirecting to new address: ${currentPath} -> ${newPath}`);
          navigate(newPath, { replace: true });
        }
      }

      // 現在のアドレスを保存
      previousAddressRef.current = currentAddress;
    }
  }, [walletState.address, navigate, location.pathname, redirectOnAddressChange, redirectPaths, onAddressChange]);

  return {
    currentAddress: walletState.address,
    previousAddress: previousAddressRef.current,
    hasAddressChanged: previousAddressRef.current !== walletState.address
  };
};

// 特定のページ用のカスタムフック
export const useOwnPageWalletChange = () => {
  return useWalletAddressChange({
    redirectOnAddressChange: true,
    redirectPaths: ['/own/'],
    onAddressChange: (oldAddress, newAddress) => {
      if (oldAddress && newAddress) {
        console.log(`👤 Own page: Wallet switched from ${oldAddress} to ${newAddress}`);
      }
    }
  });
};

export const useCreatorPageWalletChange = () => {
  return useWalletAddressChange({
    redirectOnAddressChange: true,
    redirectPaths: ['/creator/'],
    onAddressChange: (oldAddress, newAddress) => {
      if (oldAddress && newAddress) {
        console.log(`🎨 Creator page: Wallet switched from ${oldAddress} to ${newAddress}`);
      }
    }
  });
};