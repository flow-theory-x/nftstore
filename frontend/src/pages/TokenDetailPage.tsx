import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ContractService } from "../utils/contract";
import { useWallet } from "../hooks/useWallet";
import { CONTRACT_ADDRESS, OPENSEA_BASE_URL } from "../constants";
import type { NFTToken } from "../types";
import styles from "./TokenDetailPage.module.css";
import copyIcon from "../assets/icons/copy.svg";
import yachtIcon from "../assets/icons/yacht.svg";
import sendIcon from "../assets/icons/send.svg";
import fireIcon from "../assets/icons/fire.svg";
import { ModelViewer } from "../components/ModelViewer";

export const TokenDetailPage: React.FC = () => {
  const { contractAddress, tokenId } = useParams<{
    contractAddress?: string;
    tokenId: string;
  }>();
  const navigate = useNavigate();
  const { walletState, getSigner } = useWallet();
  const [token, setToken] = useState<NFTToken | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [burning, setBurning] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [activeMediaType, setActiveMediaType] = useState<
    "animation" | "external" | "youtube" | "image"
  >("animation");

  const currentContractAddress = contractAddress || CONTRACT_ADDRESS;

  useEffect(() => {
    const fetchTokenDetail = async () => {
      if (!tokenId) {
        setError("Token ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const contractService = new ContractService(currentContractAddress);

        // トークンの詳細情報を取得
        const owner = await contractService.getOwnerOf(tokenId);
        const tokenURI = await contractService.getTokenURI(tokenId);

        const tokenData: NFTToken = {
          tokenId,
          owner,
          tokenURI,
        };

        setToken(tokenData);

        // メタデータを取得
        if (tokenURI) {
          const meta = await contractService.fetchMetadata(tokenURI);
          setMetadata(meta);

          // animation_urlのMIMEタイプを取得
          if (meta?.animation_url) {
            fetchAnimationMimeType(meta.animation_url);
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch token detail:", err);
        setError(err.message || "Failed to fetch token details");
      } finally {
        setLoading(false);
      }
    };

    fetchTokenDetail();
  }, [contractAddress, tokenId, currentContractAddress]);

  // 初期表示タブの設定
  useEffect(() => {
    if (metadata) {
      if (metadata.animation_url) {
        setActiveMediaType("animation");
      } else if (metadata.youtube_url) {
        setActiveMediaType("youtube");
      } else if (metadata.image) {
        setActiveMediaType("image");
      }
    }
  }, [metadata]);

  const renderYouTubeEmbed = (url: string) => {
    // YouTube URLからIDを抽出
    const getYouTubeId = (url: string): string | null => {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
        /youtube\.com\/embed\/([\w-]+)/,
        /youtube\.com\/v\/([\w-]+)/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    const videoId = getYouTubeId(url);
    if (!videoId) {
      return (
        <div className={styles.youtubeError}>
          <p>Invalid YouTube URL</p>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Open in new tab
          </a>
        </div>
      );
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    return (
      <iframe
        src={embedUrl}
        className={styles.youtubeIframe}
        title={metadata?.name || `Token #${token?.tokenId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const [animationMimeType, setAnimationMimeType] = useState<string | null>(
    null
  );

  const isValidUrl = (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const AttributePreview: React.FC<{ url: string; alt: string }> = ({
    url,
    alt,
  }) => {
    const [mimeType, setMimeType] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      const fetchMimeType = async () => {
        try {
          const response = await fetch(url, { method: "HEAD" });
          const contentType = response.headers.get("content-type");
          setMimeType(contentType);
        } catch (err) {
          console.error("Failed to fetch MIME type:", err);
          setError(true);
        } finally {
          setIsLoading(false);
        }
      };

      fetchMimeType();
    }, [url]);

    if (isLoading) {
      return (
        <div className={styles.attributePreview}>
          <div className={styles.attributeLink}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {url.length > 50 ? `${url.substring(0, 50)}...` : url}
            </a>
          </div>
          <div className={styles.attributeLoader}>Loading...</div>
        </div>
      );
    }

    if (error || !mimeType) {
      return (
        <div className={styles.attributePreview}>
          <div className={styles.attributeLink}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {url.length > 50 ? `${url.substring(0, 50)}...` : url}
            </a>
          </div>
        </div>
      );
    }

    // 3Dモデルの場合
    if (
      mimeType.includes("model/") ||
      mimeType.includes("application/octet-stream") ||
      mimeType === "model/gltf+json" ||
      mimeType === "model/gltf-binary" ||
      url.toLowerCase().includes(".gltf") ||
      url.toLowerCase().includes(".glb")
    ) {
      return (
        <div className={styles.attributePreview}>
          <div className={styles.attributeLink}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {url.length > 50 ? `${url.substring(0, 50)}...` : url}
            </a>
          </div>
          <div className={styles.attribute3DPreview}>
            <ModelViewer
              modelUrl={url}
              alt={alt}
              className={styles.attributeModelViewer}
            />
          </div>
        </div>
      );
    }

    // 画像の場合
    if (mimeType.startsWith("image/")) {
      return (
        <div className={styles.attributePreview}>
          <div className={styles.attributeLink}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {url.length > 50 ? `${url.substring(0, 50)}...` : url}
            </a>
          </div>
          <div className={styles.attributeImagePreview}>
            <img
              src={url}
              alt={alt}
              className={styles.attributeImage}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>
      );
    }

    // 動画の場合
    if (mimeType.startsWith("video/")) {
      return (
        <div className={styles.attributePreview}>
          <div className={styles.attributeLink}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {url.length > 50 ? `${url.substring(0, 50)}...` : url}
            </a>
          </div>
          <div className={styles.attributeVideoPreview}>
            <video
              src={url}
              controls
              className={styles.attributeVideo}
              onError={(e) => {
                (e.target as HTMLVideoElement).style.display = "none";
              }}
            />
          </div>
        </div>
      );
    }

    // その他のファイル（リンクのみ）
    return (
      <div className={styles.attributePreview}>
        <div className={styles.attributeLink}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url.length > 50 ? `${url.substring(0, 50)}...` : url}
          </a>
        </div>
        <div className={styles.attributeMimeType}>{mimeType}</div>
      </div>
    );
  };

  const is3DContent = (animationUrl: string, mimeType?: string) => {
    if (!animationUrl) return false;

    // Check MIME type first if available
    if (mimeType) {
      return (
        mimeType.includes("model/") ||
        mimeType.includes("application/octet-stream") ||
        mimeType === "model/gltf+json" ||
        mimeType === "model/gltf-binary"
      );
    }

    // Check metadata mime_type if available
    if (metadata?.animation_mime_type) {
      return (
        metadata.animation_mime_type.includes("model/") ||
        metadata.animation_mime_type.includes("application/octet-stream") ||
        metadata.animation_mime_type === "model/gltf+json" ||
        metadata.animation_mime_type === "model/gltf-binary"
      );
    }

    // Fallback to file extension check
    const url = animationUrl.toLowerCase();
    return (
      url.includes(".gltf") ||
      url.includes(".glb") ||
      url.includes(".obj") ||
      url.includes(".fbx")
    );
  };

  const fetchAnimationMimeType = async (url: string) => {
    try {
      const response = await fetch(url, { method: "HEAD" });
      const contentType = response.headers.get("content-type");
      setAnimationMimeType(contentType);
      return contentType;
    } catch (error) {
      console.error("Failed to fetch MIME type:", error);
      return null;
    }
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
    if (!walletState.isConnected || !token) {
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

      // トークンページに戻る
      const backLink =
        currentContractAddress !== CONTRACT_ADDRESS
          ? `/tokens/${currentContractAddress}`
          : "/tokens";
      navigate(backLink);
    } catch (err: any) {
      console.error("Failed to burn NFT:", err);
      alert(err.message || "Failed to burn NFT");
    } finally {
      setBurning(false);
    }
  };

  const handleTransfer = async () => {
    if (!walletState.isConnected || !token) {
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

      // ページをリロードして最新の所有者情報を取得
      window.location.reload();
    } catch (err: any) {
      console.error("Failed to transfer NFT:", err);
      alert(err.message || "Failed to transfer NFT");
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading token details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <Link
            to={
              currentContractAddress !== CONTRACT_ADDRESS
                ? `/tokens/${currentContractAddress}`
                : "/tokens"
            }
            className={styles.backButton}
          >
            Back to Tokens
          </Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Token not found</p>
          <Link
            to={
              currentContractAddress !== CONTRACT_ADDRESS
                ? `/tokens/${currentContractAddress}`
                : "/tokens"
            }
            className={styles.backButton}
          >
            Back to Tokens
          </Link>
        </div>
      </div>
    );
  }

  const openSeaUrl = `${OPENSEA_BASE_URL}/${currentContractAddress}/${token.tokenId}`;
  const isOwner =
    walletState.isConnected &&
    walletState.address?.toLowerCase() === token.owner.toLowerCase();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link
          to={
            currentContractAddress !== CONTRACT_ADDRESS
              ? `/tokens/${currentContractAddress}`
              : "/tokens"
          }
          className={styles.backButton}
        >
          ← Back to Tokens
        </Link>
        <h1 className={styles.title}>
          {metadata?.name || `Token #${token.tokenId}`}
        </h1>
      </div>

      <div className={styles.content}>
        <div className={styles.imageSection}>
          {/* メディア切り替えタブ */}
          <div className={styles.mediaTabs}>
            {metadata?.animation_url && (
              <button
                className={`${styles.mediaTab} ${
                  activeMediaType === "animation" ? styles.activeTab : ""
                }`}
                onClick={() => setActiveMediaType("animation")}
              >
                Animation
              </button>
            )}
            {metadata?.youtube_url && (
              <button
                className={`${styles.mediaTab} ${
                  activeMediaType === "youtube" ? styles.activeTab : ""
                }`}
                onClick={() => setActiveMediaType("youtube")}
              >
                YouTube
              </button>
            )}
            {metadata?.image && (
              <button
                className={`${styles.mediaTab} ${
                  activeMediaType === "image" ? styles.activeTab : ""
                }`}
                onClick={() => setActiveMediaType("image")}
              >
                Image
              </button>
            )}
          </div>

          {/* メディア表示エリア */}
          <div className={styles.mediaDisplay}>
            {activeMediaType === "animation" &&
              metadata?.animation_url &&
              (is3DContent(
                metadata.animation_url,
                animationMimeType || undefined
              ) ? (
                <div className={styles.threeDPreview}>
                  <ModelViewer
                    modelUrl={metadata.animation_url}
                    alt={metadata?.name || `Token #${token.tokenId}`}
                  />
                  <div className={styles.threeDLabel}>3D Model</div>
                </div>
              ) : (
                <div className={styles.animationPreview}>
                  <video
                    src={metadata.animation_url}
                    controls
                    loop
                    className={styles.video}
                    onError={(e) => {
                      // Fallback to image if video fails
                      const container = e.currentTarget.parentElement;
                      if (container && metadata?.image) {
                        container.innerHTML = `<img src="${
                          metadata.image
                        }" alt="${
                          metadata.name || `Token #${token?.tokenId}`
                        }" class="${styles.image}" />`;
                      }
                    }}
                  />
                  <div className={styles.animationLabel}>Animation</div>
                </div>
              ))}

            {activeMediaType === "youtube" && metadata?.youtube_url && (
              <div className={styles.youtubePreview}>
                {renderYouTubeEmbed(metadata.youtube_url)}
                <div className={styles.youtubeLabel}>YouTube</div>
              </div>
            )}

            {activeMediaType === "image" && metadata?.image && (
              <div className={styles.imagePreview}>
                <img
                  src={metadata.image}
                  alt={metadata.name || `Token #${token.tokenId}`}
                  className={styles.image}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTUwSDIyNVYyMDBIMTc1VjE1MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE1MCAyMjVIMjUwVjI1MEgxNTBWMjI1WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4=";
                  }}
                />
                <div className={styles.imageLabel}>Image</div>
              </div>
            )}

            {/* デフォルト表示：利用可能なメディアがない場合 */}
            {!metadata?.animation_url &&
              !metadata?.youtube_url &&
              !metadata?.image && (
                <div className={styles.noImage}>No Media</div>
              )}
          </div>

          {/* External URLボタン（プレビューの下に表示） */}
          {(metadata?.external_url || metadata?.animation_url) && (
            <div className={styles.externalActions}>
              {metadata?.animation_url && (
                <a
                  href={
                    "https://goodsun.github.io/modelviewer/?src=" +
                    metadata.animation_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.externalLink}
                >
                  Open 3D Viewer
                </a>
              )}
              {metadata?.external_url && (
                <a
                  href={metadata.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.externalLink}
                >
                  External Link
                </a>
              )}
            </div>
          )}
        </div>

        <div className={styles.detailsSection}>
          {metadata?.description && (
            <div className={styles.description}>
              <h3>Description</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{metadata.description}</p>
            </div>
          )}

          <div className={styles.properties}>
            <h3>Properties</h3>
            <div className={styles.propertyGrid}>
              <div className={styles.property}>
                <span className={styles.propertyLabel}>Token ID</span>
                <div className={styles.propertyValue}>
                  <span>{token.tokenId}</span>
                  <button
                    onClick={() => copyToClipboard(token.tokenId)}
                    className={styles.copyButton}
                    title="Copy Token ID"
                  >
                    <img src={copyIcon} alt="Copy" width="14" height="14" />
                  </button>
                </div>
              </div>

              <div className={styles.property}>
                <span className={styles.propertyLabel}>Contract Address</span>
                <div className={styles.propertyValue}>
                  <span className={styles.address}>
                    {formatAddress(currentContractAddress)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(currentContractAddress)}
                    className={styles.copyButton}
                    title="Copy Contract Address"
                  >
                    <img src={copyIcon} alt="Copy" width="14" height="14" />
                  </button>
                </div>
              </div>

              <div className={styles.property}>
                <span className={styles.propertyLabel}>Owner</span>
                <div className={styles.propertyValue}>
                  <Link
                    to={
                      currentContractAddress !== CONTRACT_ADDRESS
                        ? `/own/${currentContractAddress}/${token.owner}`
                        : `/own/${token.owner}`
                    }
                    className={styles.ownerLink}
                    title={token.owner}
                  >
                    {formatAddress(token.owner)}
                  </Link>
                  <button
                    onClick={() => copyToClipboard(token.owner)}
                    className={styles.copyButton}
                    title="Copy Owner Address"
                  >
                    <img src={copyIcon} alt="Copy" width="14" height="14" />
                  </button>
                </div>
              </div>

              {token.tokenURI && (
                <div className={styles.property}>
                  <span className={styles.propertyLabel}>Token URI</span>
                  <div className={styles.propertyValue}>
                    <a
                      href={token.tokenURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      View Metadata
                    </a>
                    <button
                      onClick={() => copyToClipboard(token.tokenURI)}
                      className={styles.copyButton}
                      title="Copy Token URI"
                    >
                      <img src={copyIcon} alt="Copy" width="14" height="14" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {metadata?.attributes && metadata.attributes.length > 0 && (
            <div className={styles.attributes}>
              <h3>Attributes</h3>
              <div className={styles.attributeGrid}>
                {metadata.attributes.map((attr: any, index: number) => (
                  <div key={index} className={styles.attribute}>
                    <div className={styles.attributeType}>
                      {attr.trait_type}
                    </div>
                    <div className={styles.attributeValue}>
                      {isValidUrl(attr.value) ? (
                        <AttributePreview
                          url={attr.value}
                          alt={attr.trait_type}
                        />
                      ) : (
                        attr.value
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <a
              href={openSeaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.openSeaButton}
            >
              <img
                src={yachtIcon}
                alt="OpenSea"
                width="16"
                height="16"
                style={{ marginRight: "8px" }}
              />
              View on OpenSea
            </a>

            {isOwner && (
              <>
                <button
                  onClick={() => setShowTransferModal(true)}
                  disabled={transferring}
                  className={styles.transferButton}
                >
                  <img
                    src={sendIcon}
                    alt="Send"
                    width="16"
                    height="16"
                    style={{ marginRight: "8px" }}
                  />
                  {transferring ? "Transferring..." : "Transfer NFT"}
                </button>
                <button
                  onClick={handleBurn}
                  disabled={burning}
                  className={styles.burnButton}
                >
                  <img
                    src={fireIcon}
                    alt="Burn"
                    width="16"
                    height="16"
                    style={{ marginRight: "8px" }}
                  />
                  {burning ? "Burning..." : "Burn NFT"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Transfer NFT</h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                Transfer{" "}
                <strong>{metadata?.name || `Token #${token?.tokenId}`}</strong>{" "}
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
                {transferring ? "Transferring..." : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
