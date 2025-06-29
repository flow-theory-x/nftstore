import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { CHAIN_ID, CHAIN_NAME } from "../constants";
import { WalletIcon, DisconnectWalletIcon } from "../assets/icons";
import styles from "./WalletConnect.module.css";

export const WalletConnect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { walletState, isLoading, error, connectWallet, disconnectWallet } =
    useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isWrongNetwork =
    walletState.chainId && walletState.chainId !== CHAIN_ID;
  
  // Debug log
  console.log('🔍 Network check:', {
    walletChainId: walletState.chainId,
    expectedChainId: CHAIN_ID,
    chainName: CHAIN_NAME,
    isWrongNetwork
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className={styles.walletConnect}>
      {error && (
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
      )}

      {!walletState.isConnected ? (
        <button
          onClick={async () => {
            try {
              const result = await connectWallet();
              if (result && result.address) {
                // 現在のページがホームページの場合は Own ページにリダイレクト
                const currentPath = location.pathname;
                if (currentPath === '/') {
                  navigate(`/own/${result.address}`);
                }
                // その他のページではリダイレクトしない（ユーザーが現在のページに留まる）
              }
            } catch (error) {
              // Error is already handled in useWallet
            }
          }}
          disabled={isLoading}
          className={styles.connectButton}
        >
          {isLoading ? "Connecting..." : "Connect Wallet"}
          <WalletIcon style={{ marginLeft: "6px" }} />
        </button>
      ) : (
        <div className={styles.connectedInfo}>
          <div className={styles.address}>
            {formatAddress(walletState.address!)}
          </div>
          {isWrongNetwork && (
            <div className={styles.wrongNetwork}>
              Wrong Network (Please switch to {CHAIN_NAME})
            </div>
          )}
          <button
            onClick={disconnectWallet}
            className={styles.disconnectButton}
            title="Disconnect Wallet"
          >
            <DisconnectWalletIcon />
          </button>
        </div>
      )}
    </div>
  );
};
