import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { NFTToken } from "../types";
import { ContractService } from "../utils/contract";
import { CONTRACT_ADDRESS, OPENSEA_BASE_URL } from "../constants";
import { useWallet } from "../hooks/useWallet";
import styles from "./NFTCard.module.css";

interface NFTCardProps {
  token: NFTToken;
  onBurn?: () => void;
}

export const NFTCard: React.FC<NFTCardProps> = ({ token, onBurn }) => {
  const { walletState, getSigner } = useWallet();
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [burning, setBurning] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!token.tokenURI) {
        setLoading(false);
        return;
      }

      try {
        const contractService = new ContractService();
        const meta = await contractService.fetchMetadata(token.tokenURI);
        setMetadata(meta);
      } catch (err) {
        setError("Failed to load metadata");
        console.error("Failed to fetch metadata:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [token.tokenURI]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleBurn = async () => {
    if (!walletState.isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    const signer = getSigner();
    if (!signer) {
      alert("No signer available");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to burn NFT #${token.tokenId}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setBurning(true);
      const contractService = new ContractService();
      const tx = await contractService.burn(token.tokenId, signer);

      alert(`Burn transaction submitted! Hash: ${tx.hash}`);

      await tx.wait();
      alert("NFT burned successfully!");

      if (onBurn) {
        onBurn();
      }
    } catch (err: any) {
      console.error("Failed to burn NFT:", err);
      alert(err.message || "Failed to burn NFT");
    } finally {
      setBurning(false);
    }
  };

  const openSeaUrl = `${OPENSEA_BASE_URL}/${CONTRACT_ADDRESS}/${token.tokenId}`;
  const isOwner =
    walletState.isConnected &&
    walletState.address?.toLowerCase() === token.owner.toLowerCase();

  return (
    <div className={styles.nftCard}>
      <div className={styles.imageContainer}>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : metadata?.image ? (
          <img
            src={metadata.image}
            alt={metadata.name || `Token #${token.tokenId}`}
            className={styles.image}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04Ny41IDc1SDExMi41VjEwMEg4Ny41Vjc1WiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNNzUgMTEyLjVIMTI1VjEyNUg3NVYxMTIuNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+";
            }}
          />
        ) : (
          <div className={styles.noImage}>No Image</div>
        )}
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>
          {metadata?.name || `Token #${token.tokenId}`}
        </h3>

        {metadata?.description && (
          <p className={styles.description}>{metadata.description}</p>
        )}

        <div className={styles.details}>
          <div className={styles.detail}>
            <span className={styles.label}>Token ID:</span>
            <span className={styles.value}>{token.tokenId}</span>
          </div>

          <div className={styles.detail}>
            <span className={styles.label}>Owner:</span>
            <div className={styles.ownerContainer}>
              <Link
                to={`/own/${token.owner}`}
                className={`${styles.value} ${styles.ownerLink}`}
                title={token.owner}
              >
                {formatAddress(token.owner)}
              </Link>
              <button
                onClick={() => copyToClipboard(token.owner)}
                className={styles.copyButton}
                title="Copy full address"
              >
                cp
              </button>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <a
            href={openSeaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.openSeaLink}
          >
            View on OpenSea
          </a>

          {isOwner && (
            <button
              onClick={handleBurn}
              disabled={burning}
              className={styles.burnButton}
            >
              {burning ? "Burning..." : "Burn NFT"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
