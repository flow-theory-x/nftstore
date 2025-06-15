import React from "react";
import { useParams } from "react-router-dom";
import styles from "./CollectionPage.module.css";

export const CollectionPage: React.FC = () => {
  const { contractAddress } = useParams<{ contractAddress?: string }>();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Collection</h1>

      <div className={styles.content}>
        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Collection Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Contract Address:</span>
              <span className={styles.infoValue}>
                {contractAddress || "Not specified"}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Collection Name:</span>
              <span className={styles.infoValue}>Sample Collection</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Description:</span>
              <span className={styles.infoValue}>
                This is a sample collection page. More features coming soon.
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Total Supply:</span>
              <span className={styles.infoValue}>1000</span>
            </div>
          </div>
        </div>

        <div className={styles.placeholder}>
          <h3>Collection Features</h3>
          <ul>
            <li>
              <a href="/tokens/0xbb92435EF1394a08cFdED4899920D535e7D1757b">
                FlowNFT
              </a>
            </li>
            <li>
              <a href="/tokens/0xfcC562928e1F433Ff0B286d1A00495cb5B08529E">
                BonsoleilNFT
              </a>
            </li>
            <li>
              <a href="/tokens/0x72a02d559435319bd77462690e202a28c2ba8623">
                TaigaNFT
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
