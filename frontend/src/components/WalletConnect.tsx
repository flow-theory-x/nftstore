import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { CHAIN_ID } from '../constants';
import styles from './WalletConnect.module.css';

export const WalletConnect: React.FC = () => {
  const navigate = useNavigate();
  const { walletState, isLoading, error, connectWallet, disconnectWallet } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isWrongNetwork = walletState.chainId && walletState.chainId !== CHAIN_ID;

  return (
    <div className={styles.walletConnect}>
      {error && <div className={styles.error}>{error}</div>}
      
      {!walletState.isConnected ? (
        <button
          onClick={async () => {
            try {
              const result = await connectWallet();
              if (result && result.address) {
                navigate(`/own/${result.address}`);
              }
            } catch (error) {
              // Error is already handled in useWallet
            }
          }}
          disabled={isLoading}
          className={styles.connectButton}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className={styles.connectedInfo}>
          <div className={styles.address}>
            {formatAddress(walletState.address!)}
          </div>
          {isWrongNetwork && (
            <div className={styles.wrongNetwork}>
              Wrong Network (Please switch to Polygon)
            </div>
          )}
          <button
            onClick={disconnectWallet}
            className={styles.disconnectButton}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};