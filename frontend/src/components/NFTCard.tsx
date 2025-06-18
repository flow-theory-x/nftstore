import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Link, useParams } from "react-router-dom";
import type { NFTToken } from "../types";
import { NftContractService } from "../utils/nftContract";
import { TbaService } from "../utils/tbaService";
import { memberService } from "../utils/memberService";
import { CONTRACT_ADDRESS, OPENSEA_BASE_URL, TBA_TARGET_SBT_CA_ADDRESSES, TBA_TARGET_NFT_CA_ADDRESSES } from "../constants";
import type { MemberInfo } from "../types";
import { useWallet } from "../hooks/useWallet";
import styles from "./NFTCard.module.css";
// Option 1: Import as React components (current approach)
// import { YachtIcon, SendIcon, FireIcon, CopyIcon } from "../assets/icons";

// Option 2: Import as URL strings
import yachtIcon from "../assets/icons/yacht.svg";
import sendIcon from "../assets/icons/send.svg";
import fireIcon from "../assets/icons/fire.svg";
import copyIcon from "../assets/icons/copy.svg";
import backpackIcon from "../assets/icons/backpack.svg";
import { Spinner } from "./Spinner";

// Option 3: Import raw SVG content (add ?raw to any SVG)
// import yachtSvg from "../assets/icons/yacht.svg?raw";

interface NFTCardProps {
  token: NFTToken;
  contractAddress?: string;
  showOwner?: boolean;
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
  const [tbaInfo, setTbaInfo] = useState<{
    accountAddress: string;
    isDeployed: boolean;
    balance: string;
  } | null>(null);
  const [ownerMemberInfo, setOwnerMemberInfo] = useState<MemberInfo | null>(null);
  const [isOwnerTBA, setIsOwnerTBA] = useState<boolean>(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!token.tokenURI) {
        setLoading(false);
        return;
      }

      try {
        const contractService = new NftContractService(currentContractAddress);
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

  // TBA情報を取得
  useEffect(() => {
    const fetchTBAInfo = async () => {
      try {
        const tbaService = new TbaService();
        const info = await tbaService.getAccountInfo(
          currentContractAddress,
          token.tokenId
        );
        setTbaInfo(info);
      } catch (err) {
        // TBA情報の取得に失敗した場合は表示しない
        console.debug("TBA info not available for token", token.tokenId);
      }
    };

    fetchTBAInfo();
  }, [token.tokenId, currentContractAddress]);

  // Owner member info を取得
  useEffect(() => {
    const fetchOwnerMemberInfo = async () => {
      if (token.owner) {
        console.log(`🔍 NFTCard: Checking owner ${token.owner} for token ${token.tokenId}`);
        // TBAアドレスかチェック
        const tbaService = new TbaService();
        let isTBA = false;
        
        try {
          // まず既知のコントラクトから生成されたTBAアドレスかどうかを確認
          const sourceToken = await tbaService.findTBASourceToken(token.owner);
          if (sourceToken) {
            console.log(`🎯 Owner ${token.owner} is TBA for ${sourceToken.contractAddress}#${sourceToken.tokenId}`);
            isTBA = true;
          } else {
            // フォールバック: コントラクトメソッドで確認
            isTBA = await tbaService.isTBAAccount(token.owner);
          }
          
          // デバッグ用: グローバルに公開
          if (typeof window !== 'undefined') {
            (window as any).debugTBA = (address: string) => tbaService.debugTBACheck(address);
          }
        } catch (err) {
          // エラー時はfalseとして続行
          console.debug('TBA check failed:', err);
        }
        
        console.log(`👁️ NFTCard: Owner ${token.owner} isTBA=${isTBA}`);
        setIsOwnerTBA(isTBA);
        
        if (!isTBA) {
          const memberInfo = await memberService.getMemberInfo(token.owner);
          setOwnerMemberInfo(memberInfo);
        } else {
          setOwnerMemberInfo(null);
        }
      }
    };

    fetchOwnerMemberInfo();
  }, [token.owner]);

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
      const contractService = new NftContractService(currentContractAddress);
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
      const contractService = new NftContractService(currentContractAddress);
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
            <Spinner size="small" />
          ) : error ? (
            <div className={styles.error}>
              <p>{error}</p>
              <div className={styles.errorActions}>
                <button
                  onClick={() => copyToClipboard(error)}
                  className={styles.copyErrorButton}
                  title="Copy error message"
                >
                  📋 Copy Error
                </button>
              </div>
            </div>
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

          {/* TBA Badge - 画像上に重ねて表示 */}
          {tbaInfo && tbaInfo.isDeployed && (
            <div className={styles.tbaBadge}>
              <img
                src={backpackIcon}
                alt="TBA Deployed"
                width="12"
                height="12"
                className={styles.tbaBadgeIcon}
              />
            </div>
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
          <p className={styles.description} style={{ whiteSpace: "pre-wrap" }}>
            {metadata.description}
          </p>
        )}

        <div className={styles.details}>
          <div className={styles.detail}>
            <span className={styles.label}>Token ID:</span>
            <span className={styles.value}>{token.tokenId}</span>
          </div>

          <div className={styles.detail}>
            <span className={styles.label}>Owner:</span>
            <div className={styles.ownerContainer}>
              {isOwnerTBA ? (
                <img 
                  src={backpackIcon} 
                  alt="TBA Owner"
                  width="20"
                  height="20"
                  style={{ marginRight: "6px" }}
                />
              ) : ownerMemberInfo && (ownerMemberInfo.Icon || ownerMemberInfo.avatar_url) && (
                <img 
                  src={ownerMemberInfo.Icon || ownerMemberInfo.avatar_url} 
                  alt="Owner"
                  width="20"
                  height="20"
                  style={{ borderRadius: "50%", marginRight: "6px" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
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

          {/* TBA Address表示 */}
          {tbaInfo && tbaInfo.isDeployed && (
            <div className={styles.detail}>
              <span className={styles.label}>TBA:</span>
              <div className={styles.ownerContainer}>
                <Link to={`/own/${tbaInfo.accountAddress}`} className={styles.tbaAddress}>
                  {formatAddress(tbaInfo.accountAddress)}
                </Link>
                <button
                  onClick={() => copyToClipboard(tbaInfo.accountAddress)}
                  className={styles.copyButton}
                  title="Copy TBA address"
                >
                  <img src={copyIcon} alt="Copy" width="14" height="14" />
                </button>
              </div>
            </div>
          )}
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
              {!TBA_TARGET_SBT_CA_ADDRESSES.includes(contractAddress || "") && (
                <button
                  onClick={() => setShowTransferModal(true)}
                  disabled={transferring}
                  className={styles.transferButton}
                  title={transferring ? "Transferring..." : "Send NFT"}
                >
                  <img src={sendIcon} alt="Send" width="16" height="16" />
                </button>
              )}
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
        )}
    </div>
  );
};
