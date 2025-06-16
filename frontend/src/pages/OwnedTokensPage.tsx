import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { NFTCard } from '../components/NFTCard';
import { NftContractService } from '../utils/nftContract';
import type { NFTToken } from '../types';
import { useWallet } from '../hooks/useWallet';
import styles from './OwnedTokensPage.module.css';

export const OwnedTokensPage: React.FC = () => {
  const { contractAddress, address } = useParams<{ contractAddress?: string; address: string }>();
  const { walletState } = useWallet();
  const [tokens, setTokens] = useState<NFTToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = () => {
    // ページをリロードして最新データを取得
    window.location.reload();
  };

  const isOwnAddress = walletState.address?.toLowerCase() === address?.toLowerCase();

  useEffect(() => {
    const fetchTokens = async () => {
      if (!address) {
        setError('Invalid address');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const contractService = new NftContractService(contractAddress);
        const ownedTokens = await contractService.getTokensByOwner(address);
        
        setTokens(ownedTokens);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch owned tokens');
        console.error('Failed to fetch owned tokens:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [contractAddress, address]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>
          {isOwnAddress ? 'My Tokens' : `Tokens owned by ${formatAddress(address || '')}`}
        </h1>
        <div className={styles.loading}>Loading tokens...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Owned Tokens</h1>
        <div className={styles.error}>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isOwnAddress ? 'My Tokens' : `Tokens owned by ${formatAddress(address || '')}`}
        </h1>
        
        <div className={styles.addressInfo}>
          <span className={styles.addressLabel}>Address:</span>
          <span className={styles.addressValue}>{address}</span>
        </div>
      </div>
      
      {tokens.length === 0 ? (
        <div className={styles.empty}>
          <p>{isOwnAddress ? 'You don\'t own any tokens yet' : 'This address doesn\'t own any tokens'}</p>
          {isOwnAddress && (
            <Link to="/mint" className={styles.mintLink}>
              Mint your first token
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className={styles.stats}>
            Total: {tokens.length} tokens
          </div>
          
          <div className={styles.grid}>
            {tokens.map((token) => (
              <NFTCard 
                key={token.tokenId} 
                token={token} 
                contractAddress={contractAddress} 
                onBurn={handleRefresh}
                onTransfer={handleRefresh}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};