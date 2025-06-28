import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { WalletConnect } from "./WalletConnect";
import { useWallet } from "../hooks/useWallet";
import {
  COPYRIGHT_YEAR,
  COPYRIGHT_OWNER,
  COPYRIGHT_URL,
  EXTERNAL_LINK_NAME,
  EXTERNAL_LINK_URL,
  CONTRACT_ADDRESS,
  SITE_TITLE,
} from "../constants";
import styles from "./Layout.module.css";

export const Layout: React.FC = () => {
  const { walletState } = useWallet();
  const location = useLocation();
  
  // walletStateを安定化
  const stableWalletState = useMemo(() => ({
    isConnected: walletState.isConnected,
    address: walletState.address,
    chainId: walletState.chainId
  }), [walletState.isConnected, walletState.address, walletState.chainId]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [previousAddress, setPreviousAddress] = useState<string | null>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  

  // URLから現在のcontractAddressを取得
  const getContractAddressFromPath = () => {
    const pathSegments = location.pathname.split("/").filter(Boolean);

    // /tokens/CA, /mint/CA, /own/CA/address の形式をチェック
    if (pathSegments.length >= 2) {
      if (pathSegments[0] === "tokens" && pathSegments[1] !== "") {
        return pathSegments[1];
      }
      if (pathSegments[0] === "mint" && pathSegments[1] !== "") {
        return pathSegments[1];
      }
      if (
        pathSegments[0] === "own" &&
        pathSegments.length >= 3 &&
        pathSegments[1] !== ""
      ) {
        return pathSegments[1];
      }
    }
    return null;
  };

  // 現在のコントラクトアドレスを取得・管理
  const getCurrentContractAddress = () => {
    const pathAddress = getContractAddressFromPath();
    
    if (pathAddress) {
      // URLにコントラクトアドレスがある場合、localStorageに保存
      localStorage.setItem('currentContractAddress', pathAddress);
      return pathAddress;
    }
    
    // URLにない場合、localStorageから取得
    const stored = localStorage.getItem('currentContractAddress');
    if (stored) {
      return stored;
    }
    
    // どちらもない場合は最初のNFTコントラクトアドレスを使用
    return CONTRACT_ADDRESS;
  };

  const currentContractAddress = getCurrentContractAddress();
  
  // デバッグ用: ウォレット状態をログ出力
  useEffect(() => {
    console.log('🎯 Layout: Wallet state changed:', {
      isConnected: walletState.isConnected,
      address: walletState.address,
      chainId: walletState.chainId,
      timestamp: new Date().toISOString()
    });
    console.log('📋 Layout: Should show Portfolio menu:', walletState.isConnected);
  }, [walletState.isConnected, walletState.address]);

  // URLが変更された時にlocalStorageを更新
  useEffect(() => {
    const pathAddress = getContractAddressFromPath();
    if (pathAddress) {
      localStorage.setItem('currentContractAddress', pathAddress);
    }
  }, [location.pathname]);
  
  // ウォレットアドレスの変更を監視してナビゲーションリンクを更新
  useEffect(() => {
    if (walletState.address !== previousAddress) {
      if (previousAddress && walletState.address) {
        console.log(`🔄 Layout detected wallet switch: ${previousAddress} -> ${walletState.address}`);
        // ナビゲーションリンクの更新はレンダリング時に自動的に行われる
      }
      setPreviousAddress(walletState.address);
    }
  }, [walletState.address, previousAddress]);

  // ハンバーガーメニュー外をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target as Node)) {
        // ハンバーガーボタン自体をクリックした場合は除外
        const menuButton = document.querySelector(`.${styles.menuButton}`);
        if (menuButton && !menuButton.contains(event.target as Node)) {
          setIsMenuOpen(false);
        }
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // リンク生成用のヘルパー関数
  const createLink = (basePath: string, extraPath?: string) => {
    // extraPathがnullやundefinedの場合は無効なリンクを避ける

    // Ownページの場合は特別な処理
    if (basePath === "/own") {
      if (extraPath) {
        // 現在のウォレットアドレスを使用
        return `${basePath}/${extraPath}`;
      } else {
        // extraPathがない場合はウォレットが接続されていればそのアドレスを使用
        if (stableWalletState.isConnected && stableWalletState.address) {
          return `${basePath}/${stableWalletState.address}`;
        }
        return "/"; // 未接続の場合はHomeページへ
      }
    }
    
    // Creatorページの場合も特別な処理
    if (basePath === "/creator") {
      if (extraPath) {
        return `${basePath}/${extraPath}`;
      } else {
        // ウォレットが接続されていればそのアドレスを使用
        if (walletState.isConnected && walletState.address) {
          return `${basePath}/${walletState.address}`;
        }
        return "/"; // 未接続の場合はHomeページへ
      }
    }

    // その他のページ
    if (currentContractAddress && currentContractAddress !== CONTRACT_ADDRESS) {
      return extraPath
        ? `${basePath}/${currentContractAddress}/${extraPath}`
        : `${basePath}/${currentContractAddress}`;
    }
    return extraPath ? `${basePath}/${extraPath}` : basePath;
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <Link to="/" className={styles.titleLink}>
              {SITE_TITLE}
            </Link>
          </h1>
          <nav className={styles.nav}>
            <Link to="/" className={styles.navLink}>
              Home
            </Link>
            <Link to="/creator" className={styles.navLink}>
              Creators
            </Link>
            <Link to="/mint" className={styles.navLink}>
              Mint
            </Link>
            <Link to="/own" className={styles.navLink}>
              Portfolio
            </Link>
            {EXTERNAL_LINK_NAME && EXTERNAL_LINK_URL && (
              <a
                href={EXTERNAL_LINK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.navLink}
              >
                {EXTERNAL_LINK_NAME}
              </a>
            )}
          </nav>
          <div className={styles.headerRight}>
            <div className={styles.desktopWallet}>
              <WalletConnect />
            </div>
            <button
              className={styles.menuButton}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className={styles.hamburger}></span>
              <span className={styles.hamburger}></span>
              <span className={styles.hamburger}></span>
            </button>
          </div>
          <nav ref={mobileNavRef} className={`${styles.mobileNav} ${isMenuOpen ? styles.mobileNavOpen : ''}`}>
            <Link 
              to="/" 
              className={styles.navLink}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/creator" 
              className={styles.navLink}
              onClick={() => setIsMenuOpen(false)}
            >
              Creators
            </Link>
            <Link 
              to="/mint" 
              className={styles.navLink}
              onClick={() => setIsMenuOpen(false)}
            >
              Mint
            </Link>
            <Link 
              to="/own" 
              className={styles.navLink}
              onClick={() => setIsMenuOpen(false)}
            >
              Portfolio
            </Link>
            {EXTERNAL_LINK_NAME && EXTERNAL_LINK_URL && (
              <a
                href={EXTERNAL_LINK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.navLink}
                onClick={() => setIsMenuOpen(false)}
              >
                {EXTERNAL_LINK_NAME}
              </a>
            )}
            <div className={styles.mobileWallet}>
              <WalletConnect />
            </div>
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>
          &copy; {COPYRIGHT_YEAR}{" "}
          {COPYRIGHT_URL ? (
            <a href={COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
              {COPYRIGHT_OWNER}
            </a>
          ) : (
            COPYRIGHT_OWNER
          )}{" "}
          All rights reserved.
        </p>
      </footer>
    </div>
  );
};
