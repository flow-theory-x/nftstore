import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NftContractService } from "../utils/nftContract";
import { useWallet } from "../hooks/useWallet";
import { Spinner } from "../components/Spinner";
import { AddressTypeIcon } from "../components/AddressTypeIcon";
import { CHAIN_ID, CHAIN_NAME, CURRENCY_SYMBOL } from "../constants";
import styles from "./MintPage.module.css";

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
  const { contractAddress } = useParams<{ contractAddress?: string }>();
  const { walletState, getSigner } = useWallet();
  const [mintFee, setMintFee] = useState<string>("0");
  const [metaUrl, setMetaUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fetchingFee, setFetchingFee] = useState(true);
  const [metadataPreview, setMetadataPreview] =
    useState<MetadataPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [contractName, setContractName] = useState<string>("");
  const [fetchingName, setFetchingName] = useState(true);
  const [walletBalance, setWalletBalance] = useState<string>("0");
  const [fetchingBalance, setFetchingBalance] = useState(false);
  const [feeError, setFeeError] = useState<boolean>(false);
  const [customFee, setCustomFee] = useState<string>("0");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [feeRate, setFeeRate] = useState<number>(0);
  const [sbtFlag, setSbtFlag] = useState<boolean>(false);
  const [maxFeeRate, setMaxFeeRate] = useState<number>(10000);
  const [fetchingMaxFeeRate, setFetchingMaxFeeRate] = useState(true);

  const isWrongNetwork =
    walletState.chainId && walletState.chainId !== CHAIN_ID;
  const getCurrentFee = () => (feeError ? customFee : mintFee);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const canMint =
    walletState.isConnected &&
    !isWrongNetwork &&
    metaUrl.trim() !== "" &&
    metadataPreview !== null &&
    !previewError &&
    recipientAddress.trim() !== "" &&
    (!feeError || (feeError && parseFloat(customFee) >= 0)) &&
    (maxFeeRate === 0 || (feeRate >= 0 && feeRate <= maxFeeRate)) &&
    !fetchingMaxFeeRate;

  useEffect(() => {
    const fetchContractData = async () => {
      try {
        setFetchingFee(true);
        setFetchingName(true);
        setFetchingMaxFeeRate(true);
        setFeeError(false);
        const contractService = new NftContractService(contractAddress);

        const namePromise = contractService.getName();
        const maxFeeRatePromise = contractService.getMaxFeeRate();
        let feePromise;

        try {
          feePromise = await contractService.getMintFee();
          setMintFee(feePromise);
        } catch (feeErr: any) {
          console.warn(
            "Failed to fetch mint fee, using custom fee input:",
            feeErr
          );
          setFeeError(true);
          setMintFee("0");
        }

        const [name, maxFeeRateValue] = await Promise.all([namePromise, maxFeeRatePromise]);
        setContractName(name);
        const maxFeeRateNum = Number(maxFeeRateValue);
        setMaxFeeRate(maxFeeRateNum);
        
        // maxFeeRateが0の場合はfeeRateも0にリセット
        if (maxFeeRateNum === 0) {
          setFeeRate(0);
        }
      } catch (err: any) {
        console.error("Failed to fetch contract data:", err);
        setError("Failed to fetch contract data");
      } finally {
        setFetchingFee(false);
        setFetchingName(false);
        setFetchingMaxFeeRate(false);
      }
    };

    fetchContractData();
  }, [contractAddress]);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!walletState.isConnected || !walletState.address) {
        setWalletBalance("0");
        return;
      }

      try {
        setFetchingBalance(true);
        if (window.ethereum) {
          const { ethers } = await import("ethers");
          const provider = new ethers.BrowserProvider(window.ethereum);
          const balance = await provider.getBalance(walletState.address);
          setWalletBalance(ethers.formatEther(balance));
        }
      } catch (err: any) {
        console.error("Failed to fetch wallet balance:", err);
        setWalletBalance("0");
      } finally {
        setFetchingBalance(false);
      }
    };

    fetchWalletBalance();
  }, [walletState.isConnected, walletState.address, walletState.chainId]);

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
        console.error("Failed to fetch metadata:", err);
        setPreviewError(err.message || "Failed to fetch metadata");
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
      setError("Please connect your wallet");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const contractService = new NftContractService(contractAddress);
      const currentFee = getCurrentFee();
      const tx = await contractService.mint(
        recipientAddress.trim(),
        metaUrl.trim(),
        signer,
        currentFee,
        feeRate,
        sbtFlag
      );

      setSuccess(`Transaction submitted! Hash: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      setSuccess(
        `Token minted successfully! Transaction confirmed in block ${receipt?.blockNumber}`
      );

      // Clear form
      setMetaUrl("");
      setRecipientAddress("");
      setFeeRate(0);
      setSbtFlag(false);

      // Navigate to owned tokens after successful mint
      setTimeout(() => {
        navigate(`/own/${walletState.address}`);
      }, 2000);
    } catch (err: any) {
      console.error("Mint failed:", err);
      setError(err.message || "Failed to mint token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        {fetchingName ? <Spinner size="small" /> : `Mint ${contractName}`}
      </h1>

      <div className={styles.content}>
        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Mint Information</h2>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Mint Fee:</span>
              <span className={styles.infoValue}>
                {fetchingFee ? (
                  <Spinner size="small" />
                ) : feeError ? (
                  "Custom"
                ) : (
                  `${mintFee} ${CURRENCY_SYMBOL}`
                )}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Network:</span>
              <span className={styles.infoValue}>
                {CHAIN_NAME} ({CHAIN_ID})
              </span>
            </div>
          </div>
        </div>

        {walletState.isConnected && (
          <div className={styles.infoSection}>
            <h2 className={styles.sectionTitle}>Wallet Information</h2>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Address:</span>
                <span className={styles.infoValue}>
                  {walletState.address
                    ? `${walletState.address.slice(
                        0,
                        6
                      )}...${walletState.address.slice(-4)}`
                    : "Not connected"}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Balance:</span>
                <span className={styles.infoValue}>
                  {fetchingBalance ? (
                    <Spinner size="small" />
                  ) : (
                    `${parseFloat(walletBalance).toFixed(4)} ${CURRENCY_SYMBOL}`
                  )}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Chain ID:</span>
                <span
                  className={`${styles.infoValue} ${
                    isWrongNetwork ? styles.wrongNetwork : styles.correctNetwork
                  }`}
                >
                  {walletState.chainId || "Unknown"}
                  {isWrongNetwork && " (Wrong Network)"}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Sufficient Balance:</span>
                <span
                  className={`${styles.infoValue} ${
                    parseFloat(walletBalance) >= parseFloat(getCurrentFee())
                      ? styles.sufficientBalance
                      : styles.insufficientBalance
                  }`}
                >
                  {parseFloat(walletBalance) >= parseFloat(getCurrentFee())
                    ? "Yes"
                    : "No"}
                </span>
              </div>
            </div>
          </div>
        )}

        {walletState.isConnected && (
          <form onSubmit={handleMint} className={styles.form}>
            {feeError && (
              <div className={styles.feeSection}>
                <h3 className={styles.sectionTitle}>Custom Mint Fee</h3>
                <div className={styles.warningMessage}>
                  Unable to fetch mint fee from contract. Please enter the mint
                  fee manually.
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="customFee" className={styles.label}>
                    Mint Fee ({CURRENCY_SYMBOL}) *
                  </label>
                  <input
                    type="number"
                    id="customFee"
                    value={customFee}
                    onChange={(e) => setCustomFee(e.target.value)}
                    placeholder="0.0"
                    step="0.001"
                    min="0"
                    className={styles.input}
                    required
                  />
                  <div className={styles.hint}>
                    Enter the amount of {CURRENCY_SYMBOL} to send with the mint
                    transaction
                  </div>
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="recipientAddress" className={styles.label}>
                Recipient Address *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  id="recipientAddress"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  className={styles.input}
                  style={{ flex: 1 }}
                  required
                />
                {recipientAddress.trim() && (
                  <AddressTypeIcon address={recipientAddress.trim()} size="medium" />
                )}
              </div>
              <div className={styles.hint}>
                Enter the wallet address to receive the minted NFT
              </div>
              <button
                type="button"
                onClick={() => setRecipientAddress(walletState.address || "")}
                className={styles.selfButton}
                disabled={!walletState.address}
              >
                Use My Address
              </button>
            </div>

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

            {!fetchingMaxFeeRate && maxFeeRate > 0 && (
              <div className={styles.formGroup}>
                <label htmlFor="feeRate" className={styles.label}>
                  Royalty Fee Rate (basis points)
                  <span className={styles.maxInfo}> (Max: {maxFeeRate})</span>
                </label>
                <input
                  type="number"
                  id="feeRate"
                  value={feeRate}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setFeeRate(Math.min(value, maxFeeRate));
                  }}
                  placeholder="0"
                  min="0"
                  max={maxFeeRate}
                  className={styles.input}
                />
                <div className={styles.hint}>
                  Enter the royalty fee rate in basis points (e.g., 250 = 2.5%). 
                  Maximum allowed: {maxFeeRate} ({(maxFeeRate / 100).toFixed(1)}%)
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="sbtFlag"
                  checked={sbtFlag}
                  onChange={(e) => setSbtFlag(e.target.checked)}
                  className={styles.checkbox}
                />
                <label htmlFor="sbtFlag" className={styles.checkboxLabel}>
                  Soul Bound Token (SBT)
                </label>
              </div>
              <div className={styles.hint}>
                Check this to make the token non-transferable (Soul Bound)
              </div>
            </div>

            {previewLoading && (
              <div className={styles.previewSection}>
                <div className={styles.previewLoading}>
                  <Spinner size="medium" text="Loading metadata preview..." />
                </div>
              </div>
            )}

            {previewError && (
              <div className={styles.previewSection}>
                <div className={styles.previewError}>
                  <p>Failed to load metadata: {previewError}</p>
                  <div className={styles.errorActions}>
                    <button
                      onClick={() => copyToClipboard(previewError)}
                      className={styles.copyErrorButton}
                      title="Copy error message"
                    >
                      Copy
                    </button>
                  </div>
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
                        alt={metadataPreview.name || "NFT"}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
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
                        <strong>Description:</strong>{" "}
                        {metadataPreview.description}
                      </div>
                    )}
                    {metadataPreview.attributes &&
                      metadataPreview.attributes.length > 0 && (
                        <div className={styles.previewItem}>
                          <strong>Attributes:</strong>
                          <div className={styles.attributesList}>
                            {metadataPreview.attributes.map((attr, index) => (
                              <div key={index} className={styles.attributeItem}>
                                <span className={styles.traitType}>
                                  {attr.trait_type}:
                                </span>
                                <span className={styles.traitValue}>
                                  {attr.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}

            {isWrongNetwork && (
              <div className={styles.warning}>
                Please switch to {CHAIN_NAME} network to mint
              </div>
            )}

            {error && (
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
                </div>
              </div>
            )}

            {success && <div className={styles.success}>{success}</div>}

            <button
              type="submit"
              disabled={!canMint || loading || fetchingFee}
              className={styles.mintButton}
            >
              {loading
                ? "Minting..."
                : `Mint NFT (${getCurrentFee()} ${CURRENCY_SYMBOL})`}
            </button>
          </form>
        )}

        {!walletState.isConnected && (
          <div className={styles.warning}>
            Please connect your wallet to mint
          </div>
        )}
      </div>
    </div>
  );
};
