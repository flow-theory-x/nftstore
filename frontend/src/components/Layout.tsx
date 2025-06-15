import React from "react";
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
} from "../constants";
import styles from "./Layout.module.css";

export const Layout: React.FC = () => {
  const { walletState } = useWallet();
  const location = useLocation();

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

  const currentContractAddress = getContractAddressFromPath();

  // リンク生成用のヘルパー関数
  const createLink = (basePath: string, extraPath?: string) => {
    // extraPathがnullやundefinedの場合は無効なリンクを避ける

    if (currentContractAddress && currentContractAddress !== CONTRACT_ADDRESS) {
      return extraPath
        ? `${basePath}/${currentContractAddress}/${extraPath}`
        : `${basePath}/${currentContractAddress}`;
    } else if (basePath === "/own" && !extraPath) {
      return "/own/" + CONTRACT_ADDRESS;
    }
    return extraPath ? `${basePath}/${extraPath}` : basePath;
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <Link to="/" className={styles.titleLink}>
              NFT Mint Store
            </Link>
          </h1>
          <nav className={styles.nav}>
            <Link to={createLink("/collection")} className={styles.navLink}>
              Collection
            </Link>
            <Link to={createLink("/tokens")} className={styles.navLink}>
              Tokens
            </Link>
            <Link
              to={createLink("/own", walletState.address)}
              className={styles.navLink}
            >
              Own
            </Link>
            <Link to={createLink("/mint")} className={styles.navLink}>
              Mint
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
          <WalletConnect />
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
