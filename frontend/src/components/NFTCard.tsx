import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Link, useParams } from "react-router-dom";
import type { NFTToken } from "../types";
import { ContractService } from "../utils/contract";
import { CONTRACT_ADDRESS, OPENSEA_BASE_URL } from "../constants";
import { useWallet } from "../hooks/useWallet";
import styles from "./NFTCard.module.css";
// Option 1: Import as React components (current approach)
// import { YachtIcon, SendIcon, FireIcon, CopyIcon } from "../assets/icons";

// Option 2: Import as URL strings
import yachtIcon from "../assets/icons/yacht.svg";
import sendIcon from "../assets/icons/send.svg";
import fireIcon from "../assets/icons/fire.svg";
import copyIcon from "../assets/icons/copy.svg";

// Option 3: Import raw SVG content (add ?raw to any SVG)
// import yachtSvg from "../assets/icons/yacht.svg?raw";

interface NFTCardProps {
  token: NFTToken;
  contractAddress?: string;
  onBurn?: () => void;
  onTransfer?: () => void;
}

export const NFTCard: React.FC<NFTCardProps> = ({
  token,
  contractAddress,
  onBurn,
  onTransfer,
}) => {
  const { walletState, getSigner } = useWallet();
  const params = useParams<{ contractAddress?: string }>();
  const currentContractAddress =
    contractAddress || params.contractAddress || CONTRACT_ADDRESS;
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [burning, setBurning] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!token.tokenURI) {
        setLoading(false);
        return;
      }

      try {
        const contractService = new ContractService(currentContractAddress);
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
      const contractService = new ContractService(currentContractAddress);
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

  const handleTransfer = async () => {
    if (!walletState.isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!recipientAddress.trim()) {
      alert("Please enter recipient address");
      return;
    }

    const signer = getSigner();
    if (!signer) {
      alert("No signer available");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to transfer NFT #${token.tokenId} to ${recipientAddress}?`
    );

    if (!confirmed) return;

    try {
      setTransferring(true);
      const contractService = new ContractService(currentContractAddress);
      const tx = await contractService.transfer(
        token.tokenId,
        recipientAddress.trim(),
        signer
      );

      alert(`Transfer transaction submitted! Hash: ${tx.hash}`);

      await tx.wait();
      alert("NFT transferred successfully!");

      // モーダルを閉じて、入力をリセット
      setShowTransferModal(false);
      setRecipientAddress("");

      // 親コンポーネントに通知
      if (onTransfer) {
        onTransfer();
      }
    } catch (err: any) {
      console.error("Failed to transfer NFT:", err);
      alert(err.message || "Failed to transfer NFT");
    } finally {
      setTransferring(false);
    }
  };

  const openSeaUrl = `${OPENSEA_BASE_URL}/${currentContractAddress}/${token.tokenId}`;
  const isOwner =
    walletState.isConnected &&
    walletState.address?.toLowerCase() === token.owner.toLowerCase();

  return (
    <div className={styles.nftCard}>
      <Link
        to={
          currentContractAddress !== CONTRACT_ADDRESS
            ? `/token/${currentContractAddress}/${token.tokenId}`
            : `/token/${token.tokenId}`
        }
        className={styles.imageLink}
      >
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
      </Link>

      <div className={styles.info}>
        <h3 className={styles.name}>
          <Link
            to={
              currentContractAddress !== CONTRACT_ADDRESS
                ? `/token/${currentContractAddress}/${token.tokenId}`
                : `/token/${token.tokenId}`
            }
            className={styles.nameLink}
          >
            {metadata?.name || `Token #${token.tokenId}`}
          </Link>
        </h3>

        {metadata?.description && (
          <p className={styles.description} style={{ whiteSpace: 'pre-wrap' }}>{metadata.description}</p>
        )}

        <div className={styles.details}>
          <div className={styles.detail}>
            <span className={styles.label}>Token ID:</span>
            <span className={styles.value}>{token.tokenId}</span>
          </div>

          <div className={styles.detail}>
            <span className={styles.label}>Owner:</span>
            <div className={styles.ownerContainer}>
              <Link to={`/own/${currentContractAddress}/${token.owner}`}>
                {formatAddress(token.owner)}
              </Link>
              <button
                onClick={() => copyToClipboard(token.owner)}
                className={styles.copyButton}
                title="Copy full address"
              >
                <img src={copyIcon} alt="Copy" width="14" height="14" />
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
            title="View on OpenSea"
          >
            <img src={yachtIcon} alt="OpenSea" width="16" height="16" />
          </a>

          {isOwner && (
            <>
              <button
                onClick={() => setShowTransferModal(true)}
                disabled={transferring}
                className={styles.transferButton}
                title={transferring ? "Transferring..." : "Send NFT"}
              >
                <img src={sendIcon} alt="Send" width="16" height="16" />
              </button>
              <button
                onClick={handleBurn}
                disabled={burning}
                className={styles.burnButton}
                title={burning ? "Burning..." : "Burn NFT"}
              >
                <img src={fireIcon} alt="Burn" width="16" height="16" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transfer Modal - Rendered at the end of document body */}
      {showTransferModal && 
        ReactDOM.createPortal(
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>Send NFT</h3>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className={styles.closeButton}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <p>
                  Send{" "}
                  <strong>{metadata?.name || `Token #${token.tokenId}`}</strong>{" "}
                  to:
                </p>
                <input
                  type="text"
                  placeholder="Recipient address (0x...)"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className={styles.addressInput}
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={transferring || !recipientAddress.trim()}
                  className={styles.confirmButton}
                >
                  {transferring ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }
    </div>
  );
};
