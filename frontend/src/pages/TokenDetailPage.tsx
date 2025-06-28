import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { NftContractService } from "../utils/nftContract";
import { TbaService } from "../utils/tbaService";
import { useWallet } from "../hooks/useWallet";
import { useOwnerAndCreatorInfo } from "../hooks/useAddressInfo";
import { AddressDisplayUtils } from "../utils/addressDisplayUtils";
import {
  CONTRACT_ADDRESS,
  OPENSEA_BASE_URL,
  MODEL_VIEWER_BASE_URL,
  isTBAEnabled,
  isTBATargetContract,
} from "../constants";
import type { NFTToken } from "../types";
import styles from "./TokenDetailPage.module.css";
import copyIcon from "../assets/icons/copy.svg";
import yachtIcon from "../assets/icons/yacht.svg";
import sendIcon from "../assets/icons/send.svg";
import backpackIcon from "../assets/icons/backpack.svg";
import fireIcon from "../assets/icons/fire.svg";
import { ModelViewer } from "../components/ModelViewer";
import { AddressTypeIcon } from "../components/AddressTypeIcon";
import { NFTCard } from "../components/NFTCard";
import { Spinner } from "../components/Spinner";

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
  const [modelLoadError, setModelLoadError] = useState(false);
  const [originalTokenInfo, setOriginalTokenInfo] = useState<any>(null);
  const [loadingOriginalInfo, setLoadingOriginalInfo] = useState(false);

  // TBA関連の状態
  const [creatingTBA, setCreatingTBA] = useState(false);
  const [tbaInfo, setTbaInfo] = useState<{
    accountAddress: string;
    isDeployed: boolean;
    balance: string;
  } | null>(null);
  const [tbaOwnedTokensByContract, setTbaOwnedTokensByContract] = useState<{
    [contractAddress: string]: {
      tokens: string[];
      tokenDetails: NFTToken[];
      contractName: string;
      loading: boolean;
    };
  }>({});
  const [loadingTbaTokens, setLoadingTbaTokens] = useState(false);
  const [creatorAddress, setCreatorAddress] = useState<string | null>(null);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [isOwnerTBA, setIsOwnerTBA] = useState(false);
  const [checkingTBA, setCheckingTBA] = useState(false);
  const [parentNFTInfo, setParentNFTInfo] = useState<{
    tokenContract: string;
    tokenId: string;
    owner: string;
  } | null>(null);
  const [isParentNFTOwner, setIsParentNFTOwner] = useState(false);

  const currentContractAddress = contractAddress || CONTRACT_ADDRESS;
  
  // このNFTがTBA機能付きかどうか（TBA対象コントラクトかどうか）
  const hasTBAFeature = isTBAEnabled() && isTBATargetContract(currentContractAddress);

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
        setModelLoadError(false);

        const contractService = new NftContractService(currentContractAddress);

        // トークンの詳細情報を取得
        const owner = await contractService.getOwnerOf(tokenId);
        const tokenURI = await contractService.getTokenURI(tokenId);

        // Creator情報、SBTフラグ、OriginalTokenInfoを並行取得
        const [creator, isSbt, originalInfo] = await Promise.all([
          contractService.getTokenCreator(tokenId).catch(() => null),
          contractService.getSbtFlag(tokenId).catch(() => false),
          contractService.getOriginalTokenInfo(tokenId).catch((err) => {
            console.warn("Failed to get original token info:", err);
            return null;
          }),
        ]);

        console.log("📋 Original Token Info:", originalInfo);
        setOriginalTokenInfo(originalInfo);
        setCreatorAddress(creator);
        setCreatorLoading(false);

        const tokenData: NFTToken = {
          id: tokenId,
          tokenId,
          owner,
          tokenURI,
          contractAddress: currentContractAddress,
          isSbt,
        };

        setToken(tokenData);

        // Owner がTBAかどうかを判定
        setCheckingTBA(true);
        try {
          const tbaService = new TbaService();
          const isTBA = await tbaService.isTBAAccount(owner);
          setIsOwnerTBA(isTBA);

          // OwnerがTBAの場合、親NFTの情報を取得
          if (isTBA) {
            try {
              const parentToken = await tbaService.getToken(owner);
              const parentNftService = new NftContractService(parentToken.tokenContract);
              const parentOwner = await parentNftService.getOwnerOf(parentToken.tokenId);
              
              setParentNFTInfo({
                tokenContract: parentToken.tokenContract,
                tokenId: parentToken.tokenId,
                owner: parentOwner
              });

              // 現在のウォレットが親NFTの所有者かどうかをチェック
              if (walletState.address && parentOwner.toLowerCase() === walletState.address.toLowerCase()) {
                setIsParentNFTOwner(true);
              }
            } catch (err) {
              console.warn("Failed to get parent NFT info:", err);
            }
          }
        } catch (err) {
          console.warn("Failed to check TBA status:", err);
          setIsOwnerTBA(false);
        } finally {
          setCheckingTBA(false);
        }

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
  }, [contractAddress, tokenId, currentContractAddress, walletState.address]);

  const addressInfo = useOwnerAndCreatorInfo(token?.owner, creatorAddress);

  // TBA情報を取得（TBA機能が有効で、対象コントラクトの場合のみ）
  useEffect(() => {
    if (!tokenId || !currentContractAddress) return;

    if (!isTBAEnabled() || !isTBATargetContract(currentContractAddress)) {
      console.log(
        `⏭️ TokenDetailPage: Skipping TBA info for ${currentContractAddress} (not TBA target)`
      );
      return;
    }

    const fetchTBAInfo = async () => {
      try {
        console.log(
          `🔍 TokenDetailPage: Fetching TBA info for token ${tokenId}`
        );
        const tbaService = new TbaService();
        const info = await tbaService.getAccountInfo(
          currentContractAddress,
          tokenId
        );
        setTbaInfo(info);
      } catch (err) {
        console.error("Failed to fetch TBA info:", err);
        setTbaInfo(null);
      }
    };

    fetchTBAInfo();
  }, [tokenId, currentContractAddress]);
  // TBA保有NFTを取得（複数コントラクト対応、TBA機能が有効な場合のみ）

  useEffect(() => {
    if (!isTBAEnabled()) {
      console.log(
        `⏭️ TokenDetailPage: Skipping TBA owned tokens (TBA not enabled)`
      );
      return;
    }

    const fetchTBAOwnedTokensForAllContracts = async () => {
      if (!tbaInfo || !tbaInfo.isDeployed || !tbaInfo.accountAddress) {
        setTbaOwnedTokensByContract({});
        return;
      }

      // NFTとSBTコントラクトを結合
      const allTargetContracts = [CONTRACT_ADDRESS];

      if (allTargetContracts.length === 0) {
        console.warn("No TBA target contract addresses configured");
        return;
      }

      try {
        setLoadingTbaTokens(true);
        console.log(
          `🔍 Searching for NFTs owned by TBA: ${tbaInfo.accountAddress}`
        );
        console.log(`📋 Target contract: ${CONTRACT_ADDRESS}`);

        // 各コントラクトに対して並行処理
        const contractPromises = allTargetContracts.map(
          async (contractAddress) => {
            try {
              // コントラクトサービスを使用してトークン検索
              const contractService = new NftContractService(contractAddress);
              
              // TBA所有のトークンを検索（簡易版）
              // 注意: この機能はパフォーマンス上の理由で制限されています
              console.log(`⚠️ TBA token search temporarily disabled for performance reasons`);
              const ownedTokens: string[] = [];

              console.log(
                `🎯 TBA owns ${ownedTokens.length} tokens from ${contractAddress}`
              );
              let contractName = "NFTs";
              try {
                contractName = (await contractService.getName()) || "NFTs";
              } catch (err) {
                console.warn(
                  `Failed to fetch contract name for ${contractAddress}:`,
                  err
                );
              }

              // 各トークンの詳細情報を取得
              const tokenDetails: NFTToken[] = [];
              if (ownedTokens.length > 0) {
                for (const tokenId of ownedTokens) {
                  try {
                    const owner = await contractService.getOwnerOf(tokenId);
                    const tokenURI = await contractService.getTokenURI(tokenId);

                    tokenDetails.push({
                      id: tokenId,
                      tokenId,
                      owner,
                      tokenURI,
                      contractAddress,
                    });
                  } catch (err) {
                    console.error(
                      `Failed to fetch details for token ${tokenId} from ${contractAddress}:`,
                      err
                    );
                  }
                }
              }

              return {
                contractAddress,
                tokens: ownedTokens,
                tokenDetails,
                contractName,
                loading: false,
              };
            } catch (err) {
              console.error(
                `Failed to fetch TBA owned tokens from ${contractAddress}:`,
                err
              );
              return {
                contractAddress,
                tokens: [],
                tokenDetails: [],
                contractName: "NFTs",
                loading: false,
              };
            }
          }
        );

        // 全てのコントラクトの結果を待つ
        const results = await Promise.all(contractPromises);

        // stateを更新
        const newState: typeof tbaOwnedTokensByContract = {};
        results.forEach((result) => {
          newState[result.contractAddress] = {
            tokens: result.tokens,
            tokenDetails: result.tokenDetails,
            contractName: result.contractName,
            loading: false,
          };
        });

        setTbaOwnedTokensByContract(newState);
        console.log(
          `📊 Completed fetching TBA owned tokens for ${results.length} contracts`
        );
      } catch (err) {
        console.error("Failed to fetch TBA owned tokens:", err);
        setTbaOwnedTokensByContract({});
      } finally {
        setLoadingTbaTokens(false);
      }
    };

    fetchTBAOwnedTokensForAllContracts();
  }, [tbaInfo]);

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

    const confirmMessage = isParentNFTOwner && !isOwner
      ? `Are you sure you want to burn NFT #${token.tokenId} via parent NFT control? This action cannot be undone.`
      : `Are you sure you want to burn NFT #${token.tokenId}? This action cannot be undone.`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    try {
      setBurning(true);
      
      if (isParentNFTOwner && !isOwner && isOwnerTBA) {
        // TBA経由でburn
        console.log("Burning NFT via TBA executeCall...");
        const { ethers } = await import("ethers");
        
        // burn(tokenId)のエンコード
        const iface = new ethers.Interface([
          "function burn(uint256 tokenId)"
        ]);
        const data = iface.encodeFunctionData("burn", [token.tokenId]);

        const tbaService = new TbaService();
        const accountContract = new ethers.Contract(
          token.owner, // TBA account address
          await import("../../config/tba_account_abi.json").then(m => m.default),
          signer
        );
        
        const tx = await (accountContract as any).executeCall(
          token.contractAddress, // NFT contract address
          0, // value
          data // encoded burn call
        );

        alert(`TBA burn transaction submitted! Hash: ${tx.hash}`);
        await tx.wait();
        alert("NFT burned successfully via TBA!");
        
      } else {
        // 直接burn
        console.log("Burning NFT directly...");
        const contractService = new NftContractService(token.contractAddress);
        const tx = await contractService.burn(token.tokenId, signer);

        alert(`Burn transaction submitted! Hash: ${tx.hash}`);
        await tx.wait();
        alert("NFT burned successfully!");
      }

      // クリエイターページまたはトークンページに戻る
      const backLink = creatorAddress 
        ? `/creator/${creatorAddress}`
        : token.contractAddress !== CONTRACT_ADDRESS
          ? `/tokens/${token.contractAddress}`
          : "/tokens";
      navigate(backLink);
    } catch (err: any) {
      console.error("Failed to burn NFT:", err);
      alert(err.message || "Failed to burn NFT");
    } finally {
      setBurning(false);
    }
  };

  const handleCreateTBA = async () => {
    if (!walletState.isConnected || !token) {
      alert("Please connect your wallet first");
      return;
    }

    const signer = getSigner();
    if (!signer) {
      alert("Failed to get signer");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to create a TBA (Token Bound Account) for NFT #${token.tokenId}?\n\n` +
      `What TBA does:\n` +
      `• Gives this NFT its own wallet functionality\n` +
      `• Allows the NFT to own other tokens and assets\n` +
      `• Enables the NFT to interact with smart contracts\n\n` +
      `⚠️ Important: Once TBA is created, this NFT can NO LONGER be burned.\n` +
      `This is a permanent change that cannot be undone.\n\n` +
      `Do you want to proceed?`
    );

    if (!confirmed) return;

    try {
      setCreatingTBA(true);
      const tbaService = new TbaService();

      const tx = await tbaService.createAccountForToken(
        currentContractAddress,
        token.tokenId,
        signer
      );

      alert(`TBA creation transaction submitted! Hash: ${tx.hash}`);

      await tx.wait();
      alert("TBA account created successfully!");

      // TBA情報を再取得
      const info = await tbaService.getAccountInfo(
        currentContractAddress,
        token.tokenId
      );
      setTbaInfo(info);
    } catch (err: any) {
      console.error("Failed to create TBA:", err);
      alert(err.message || "Failed to create TBA account");
    } finally {
      setCreatingTBA(false);
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

    const confirmMessage = isParentNFTOwner && !isOwner
      ? `Are you sure you want to transfer NFT #${token.tokenId} to ${recipientAddress} via parent NFT control?`
      : `Are you sure you want to transfer NFT #${token.tokenId} to ${recipientAddress}?`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    try {
      setTransferring(true);
      
      if (isParentNFTOwner && !isOwner && isOwnerTBA) {
        // TBA経由でtransfer
        console.log("Transferring NFT via TBA executeCall...");
        const { ethers } = await import("ethers");
        
        // safeTransferFrom(from, to, tokenId)のエンコード
        const iface = new ethers.Interface([
          "function safeTransferFrom(address from, address to, uint256 tokenId)"
        ]);
        const data = iface.encodeFunctionData("safeTransferFrom", [
          token.owner, // from (TBA address)
          recipientAddress.trim(), // to
          token.tokenId
        ]);

        const accountContract = new ethers.Contract(
          token.owner, // TBA account address
          await import("../../config/tba_account_abi.json").then(m => m.default),
          signer
        );
        
        const tx = await (accountContract as any).executeCall(
          token.contractAddress, // NFT contract address
          0, // value
          data // encoded transfer call
        );

        alert(`TBA transfer transaction submitted! Hash: ${tx.hash}`);
        await tx.wait();
        alert("NFT transferred successfully via TBA!");
        
      } else {
        // 直接transfer
        console.log("Transferring NFT directly...");
        const contractService = new NftContractService(token.contractAddress);
        const tx = await contractService.transfer(
          recipientAddress.trim(),
          token.tokenId,
          signer
        );

        alert(`Transfer transaction submitted! Hash: ${tx.hash}`);
        await tx.wait();
        alert("NFT transferred successfully!");
      }

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
        <Spinner size="large" text="Loading token details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <div className={styles.errorActions}>
            <button
              onClick={() => copyToClipboard(error)}
              className={styles.copyErrorButton}
              title="Copy error message"
            >
              Copy
            </button>
            {creatorAddress ? (
              <Link
                to={`/creator/${creatorAddress}`}
                className={styles.backButton}
              >
                Back to Creator
              </Link>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Token not found</p>
          {creatorAddress ? (
            <Link
              to={`/creator/${creatorAddress}`}
              className={styles.backButton}
            >
              Back to Creator
            </Link>
          ) : (
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
          )}
        </div>
      </div>
    );
  }

  const openSeaUrl = `${OPENSEA_BASE_URL}/${currentContractAddress}/${token.tokenId}`;
  const isOwner =
    walletState.isConnected &&
    walletState.address?.toLowerCase() === token.owner.toLowerCase();
  
  // 親NFT所有者かTBA Owned NFTの場合は、親NFT所有者が操作可能
  const canControl = isOwner || isParentNFTOwner;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {creatorAddress ? (
          <Link
            to={`/creator/${creatorAddress}`}
            className={styles.backButton}
          >
            ← Back to Creator
          </Link>
        ) : (
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
        )}
        <h1 className={styles.title}>
          {tbaInfo?.isDeployed && (
            <div className={styles.tbaIcon}>
              <img 
                src={backpackIcon} 
                alt="TBA Deployed"
              />
            </div>
          )}
          {metadata?.name || `Token #${token.tokenId}`}
          {token.isSbt && <span className={styles.sbtBadge}>SBT</span>}
          {isOwnerTBA && <span className={styles.tbaBadge}>Owned by TBA</span>}
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
              ) && !modelLoadError ? (
                <div className={styles.threeDPreview}>
                  <ModelViewer
                    modelUrl={metadata.animation_url}
                    alt={metadata?.name || `Token #${token.tokenId}`}
                    onError={() => {
                      setModelLoadError(true);
                      setActiveMediaType("image");
                    }}
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
                    onError={() => {
                      // Switch to image tab if video fails
                      setActiveMediaType("image");
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
              {metadata?.animation_url &&
                is3DContent(metadata.animation_url, animationMimeType) && (
                  <a
                    href={
                      MODEL_VIEWER_BASE_URL + "/?src=" + metadata.animation_url
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
                    {AddressDisplayUtils.formatAddress(currentContractAddress)}
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
                    {addressInfo.owner.displayName}
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

              {/* Parent NFT info for TBA owned tokens */}
              {isOwnerTBA && parentNFTInfo && (
                <div className={styles.property}>
                  <span className={styles.propertyLabel}>Parent NFT</span>
                  <div className={styles.propertyValue}>
                    <Link
                      to={`/token/${parentNFTInfo.tokenContract}/${parentNFTInfo.tokenId}`}
                      className={styles.link}
                      title={`Token #${parentNFTInfo.tokenId}`}
                    >
                      Token #{parentNFTInfo.tokenId}
                    </Link>
                    <span style={{ margin: "0 8px", color: "#666" }}>→</span>
                    <Link
                      to={
                        parentNFTInfo.tokenContract !== CONTRACT_ADDRESS
                          ? `/own/${parentNFTInfo.tokenContract}/${parentNFTInfo.owner}`
                          : `/own/${parentNFTInfo.owner}`
                      }
                      className={styles.ownerLink}
                      title={parentNFTInfo.owner}
                    >
                      {AddressDisplayUtils.formatAddress(parentNFTInfo.owner)}
                    </Link>
                    {isParentNFTOwner && (
                      <span className={styles.parentOwnerBadge}>You control this NFT</span>
                    )}
                  </div>
                </div>
              )}

              {/* Creator information */}
              {creatorLoading ? (
                <div className={styles.property}>
                  <span className={styles.propertyLabel}>Creator</span>
                  <div className={styles.propertyValue}>
                    <span className={styles.loading}>Loading...</span>
                  </div>
                </div>
              ) : creatorAddress ? (
                <div className={styles.property}>
                  <span className={styles.propertyLabel}>Creator</span>
                  <div className={styles.propertyValue}>
                    <Link
                      to={
                        currentContractAddress !== CONTRACT_ADDRESS
                          ? `/own/${currentContractAddress}/${creatorAddress}`
                          : `/own/${creatorAddress}`
                      }
                      className={styles.ownerLink}
                    >
                      {addressInfo.creator.displayName}
                    </Link>
                    <button
                      onClick={() => copyToClipboard(creatorAddress)}
                      className={styles.copyButton}
                      title="Copy Creator Address"
                    >
                      <img src={copyIcon} alt="Copy" width="14" height="14" />
                    </button>
                  </div>
                </div>
              ) : null}

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

              {tbaInfo && tbaInfo.accountAddress && tbaInfo.isDeployed && (
                <div className={styles.property}>
                  <span className={styles.propertyLabel}>TBA Account</span>
                  <div className={styles.propertyValue}>
                    <Link
                      to={`/own/${tbaInfo.accountAddress}`}
                      className={styles.address}
                    >
                      {AddressDisplayUtils.formatAddress(tbaInfo.accountAddress)}
                    </Link>
                    <button
                      onClick={() => copyToClipboard(tbaInfo.accountAddress)}
                      className={styles.copyButton}
                      title="Copy TBA Address"
                    >
                      <img src={copyIcon} alt="Copy" width="14" height="14" />
                    </button>
                    {tbaInfo.isDeployed && tbaInfo.balance !== "0.0" && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "12px",
                          color: "#666",
                        }}
                      >
                        ({tbaInfo.balance}{" "}
                        {import.meta.env.VITE_CURRENCY_SYMBOL})
                      </span>
                    )}
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

          {/* Original Token Info Section */}
          {originalTokenInfo && originalTokenInfo !== "" && (
            <div className={styles.originalTokenInfo}>
              <h3>Original Token Information</h3>
              <div className={styles.originalInfoValue}>
                {originalTokenInfo}
                <button
                  onClick={() => copyToClipboard(originalTokenInfo)}
                  className={styles.copyButton}
                  title="Copy Original Token Info"
                  style={{ marginLeft: "8px" }}
                >
                  <img src={copyIcon} alt="Copy" width="14" height="14" />
                </button>
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

            {canControl && (
              <>
                {!token.isSbt && (
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
                    {isParentNFTOwner && !isOwner && " (via Parent NFT)"}
                  </button>
                )}

                {isOwner && tbaInfo && tbaInfo.accountAddress && !tbaInfo.isDeployed ? (
                  <button
                    onClick={handleCreateTBA}
                    disabled={creatingTBA}
                    className={styles.tbaButton}
                  >
                    <img
                      src={backpackIcon}
                      alt="TBA"
                      width="16"
                      height="16"
                      style={{ marginRight: "8px" }}
                    />
                    {creatingTBA ? "Creating TBA..." : "Create TBA Account"}
                  </button>
                ) : null}

                {!(tbaInfo && tbaInfo.isDeployed) && (
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
                    {isParentNFTOwner && !isOwner && " (via Parent NFT)"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* TBA Owned NFTs Section - Multiple Contracts */}
      {tbaInfo &&
        tbaInfo.isDeployed &&
        (loadingTbaTokens ? (
          <div className={styles.container}>
            <div className={styles.tbaOwnedSection}>
              <h2 className={styles.title}>
                <img
                  src={backpackIcon}
                  alt="TBA"
                  width="24"
                  height="24"
                  style={{ marginRight: "12px", verticalAlign: "middle" }}
                />
                TBA Owned NFTs
              </h2>
              <Spinner size="medium" text="Loading TBA owned NFTs..." />
            </div>
          </div>
        ) : Object.entries(tbaOwnedTokensByContract).some(
            ([_, contractData]) => contractData.tokenDetails.length > 0
          ) ? (
          <div className={styles.container}>
            {Object.entries(tbaOwnedTokensByContract)
              .filter(
                ([contractAddress, contractData]) =>
                  contractData.tokenDetails.length > 0
              )
              .map(([contractAddress, contractData]) => (
                <div key={contractAddress} className={styles.tbaOwnedSection}>
                  <h2 className={styles.title}>
                    <img
                      src={backpackIcon}
                      alt="TBA"
                      width="24"
                      height="24"
                      style={{ marginRight: "12px", verticalAlign: "middle" }}
                    />
                    TBA Owned{" "}
                    <Link
                      to={`/tokens/${contractAddress}`}
                      className={styles.tbaContractLink}
                    >
                      {contractData.contractName}
                    </Link>
                  </h2>

                  <div>
                    <p style={{ color: "#666", marginBottom: "20px" }}>
                      This TBA account owns {contractData.tokenDetails.length}{" "}
                      {contractData.contractName} NFT
                      {contractData.tokenDetails.length > 1 ? "s" : ""}
                    </p>
                    <div className={styles.grid}>
                      {contractData.tokenDetails.map((token) => (
                        <NFTCard
                          key={`${contractAddress}-${token.tokenId}`}
                          token={token}
                          onBurn={() => {
                            // TBA保有NFTリストを再取得
                            window.location.reload();
                          }}
                          onTransfer={() => {
                            // TBA保有NFTリストを再取得
                            window.location.reload();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className={styles.container}>
            <div className={styles.tbaOwnedSection}>
              <h2 className={styles.title}>
                <img
                  src={backpackIcon}
                  alt="TBA"
                  width="24"
                  height="24"
                  style={{ marginRight: "12px", verticalAlign: "middle" }}
                />
                TBA Owned NFTs
              </h2>
              <p style={{ color: "#666" }}>
                This TBA account doesn't own any NFTs from the configured
                contracts
              </p>
            </div>
          </div>
        ))}

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Recipient address (0x...)"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className={styles.addressInput}
                  style={{ flex: 1 }}
                />
                {recipientAddress.trim() && (
                  <AddressTypeIcon address={recipientAddress.trim()} size="medium" />
                )}
              </div>
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
