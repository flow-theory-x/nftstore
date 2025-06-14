import React from "react";
import { Link, Outlet } from "react-router-dom";
import { WalletConnect } from "./WalletConnect";
import { useWallet } from "../hooks/useWallet";
import { COPYRIGHT_YEAR, COPYRIGHT_OWNER, COPYRIGHT_URL, EXTERNAL_LINK_NAME, EXTERNAL_LINK_URL } from "../constants";
import styles from "./Layout.module.css";

export const Layout: React.FC = () => {
  const { walletState } = useWallet();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <Link to="/tokens" className={styles.titleLink}>
              NFT Mint Store
            </Link>
          </h1>
          <nav className={styles.nav}>
            <Link to="/tokens" className={styles.navLink}>
              All Tokens
            </Link>
            {walletState.isConnected && (
              <Link
                to={`/own/${walletState.address}`}
                className={styles.navLink}
              >
                My Tokens
              </Link>
            )}
            <Link to="/mint" className={styles.navLink}>
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
