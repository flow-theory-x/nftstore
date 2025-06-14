import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContractService } from '../utils/contract';
import { useWallet } from '../hooks/useWallet';
import { CHAIN_ID, CURRENCY_SYMBOL } from '../constants';
import styles from './MintPage.module.css';

interface MetadataPreview {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export const MintPage: React.FC = () => {
  const navigate = useNavigate();
  const { walletState, getSigner } = useWallet();
  const [mintFee, setMintFee] = useState<string>('0');
  const [metaUrl, setMetaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fetchingFee, setFetchingFee] = useState(true);
  const [metadataPreview, setMetadataPreview] = useState<MetadataPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const isWrongNetwork = walletState.chainId && walletState.chainId !== CHAIN_ID;
  const canMint = walletState.isConnected && !isWrongNetwork && metaUrl.trim() !== '' && metadataPreview !== null && !previewError;

  useEffect(() => {
    const fetchMintFee = async () => {
      try {
        setFetchingFee(true);
        const contractService = new ContractService();
        const fee = await contractService.getMintFee();
        setMintFee(fee);
      } catch (err: any) {
        console.error('Failed to fetch mint fee:', err);
        setError('Failed to fetch mint fee');
      } finally {
        setFetchingFee(false);
      }
    };

    fetchMintFee();
  }, []);

  useEffect(() => {
    const fetchMetadataPreview = async () => {
      if (!metaUrl.trim()) {
        setMetadataPreview(null);
        setPreviewError(null);
        return;
      }

      try {
        setPreviewLoading(true);
        setPreviewError(null);
        
        const response = await fetch(metaUrl.trim());
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const metadata = await response.json();
        setMetadataPreview(metadata);
      } catch (err: any) {
        console.error('Failed to fetch metadata:', err);
        setPreviewError(err.message || 'Failed to fetch metadata');
        setMetadataPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchMetadataPreview, 500);
    return () => clearTimeout(timeoutId);
  }, [metaUrl]);

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canMint) {
      return;
    }

    const signer = getSigner();
    if (!signer) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const contractService = new ContractService();
      const tx = await contractService.mint(walletState.address!, metaUrl.trim(), signer);
      
      setSuccess(`Transaction submitted! Hash: ${tx.hash}`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      setSuccess(`Token minted successfully! Transaction confirmed in block ${receipt?.blockNumber}`);
      
      // Clear form
      setMetaUrl('');
      
      // Navigate to owned tokens after successful mint
      setTimeout(() => {
        navigate(`/own/${walletState.address}`);
      }, 2000);
      
    } catch (err: any) {
      console.error('Mint failed:', err);
      alert(err.message || 'Failed to mint token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Mint NFT</h1>
      
      <div className={styles.content}>
        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Mint Information</h2>
          
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Mint Fee:</span>
              <span className={styles.infoValue}>
                {fetchingFee ? 'Loading...' : `${mintFee} ${CURRENCY_SYMBOL}`}
              </span>
            </div>
            
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Network:</span>
              <span className={styles.infoValue}>Polygon (137)</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleMint} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="metaUrl" className={styles.label}>
              Metadata URL *
            </label>
            <input
              type="url"
              id="metaUrl"
              value={metaUrl}
              onChange={(e) => setMetaUrl(e.target.value)}
              placeholder="https://example.com/metadata.json"
              className={styles.input}
              required
            />
            <div className={styles.hint}>
              Enter the URL to your NFT metadata JSON file
            </div>
          </div>

          {previewLoading && (
            <div className={styles.previewSection}>
              <div className={styles.previewLoading}>Loading metadata preview...</div>
            </div>
          )}

          {previewError && (
            <div className={styles.previewSection}>
              <div className={styles.previewError}>
                Failed to load metadata: {previewError}
              </div>
            </div>
          )}

          {metadataPreview && (
            <div className={styles.previewSection}>
              <h3 className={styles.previewTitle}>Metadata Preview</h3>
              <div className={styles.previewContent}>
                {metadataPreview.image && (
                  <div className={styles.previewImage}>
                    <img 
                      src={metadataPreview.image} 
                      alt={metadataPreview.name || 'NFT'} 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className={styles.previewDetails}>
                  {metadataPreview.name && (
                    <div className={styles.previewItem}>
                      <strong>Name:</strong> {metadataPreview.name}
                    </div>
                  )}
                  {metadataPreview.description && (
                    <div className={styles.previewItem}>
                      <strong>Description:</strong> {metadataPreview.description}
                    </div>
                  )}
                  {metadataPreview.attributes && metadataPreview.attributes.length > 0 && (
                    <div className={styles.previewItem}>
                      <strong>Attributes:</strong>
                      <div className={styles.attributesList}>
                        {metadataPreview.attributes.map((attr, index) => (
                          <div key={index} className={styles.attributeItem}>
                            <span className={styles.traitType}>{attr.trait_type}:</span>
                            <span className={styles.traitValue}>{attr.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!walletState.isConnected && (
            <div className={styles.warning}>
              Please connect your wallet to mint
            </div>
          )}

          {isWrongNetwork && (
            <div className={styles.warning}>
              Please switch to Polygon network to mint
            </div>
          )}

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {success && (
            <div className={styles.success}>
              {success}
            </div>
          )}


          <button
            type="submit"
            disabled={!canMint || loading || fetchingFee}
            className={styles.mintButton}
          >
            {loading ? 'Minting...' : `Mint NFT (${mintFee} ${CURRENCY_SYMBOL})`}
          </button>
        </form>
      </div>
    </div>
  );
};