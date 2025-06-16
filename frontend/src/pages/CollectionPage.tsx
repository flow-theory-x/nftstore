import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { TBA_TARGET_NFT_CA_ADDRESSES, TBA_TARGET_SBT_CA_ADDRESSES } from "../constants";
import { NftContractService } from "../utils/nftContract";
import styles from "./CollectionPage.module.css";

export const CollectionPage: React.FC = () => {
  const { contractAddress } = useParams<{ contractAddress?: string }>();
  const [nftCollectionFeatures, setNftCollectionFeatures] = useState<{
    contractAddress: string;
    contractName: string;
    totalSupply: number;
  }[]>([]);
  const [sbtCollectionFeatures, setSbtCollectionFeatures] = useState<{
    contractAddress: string;
    contractName: string;
    totalSupply: number;
  }[]>([]);
  const [loadingNft, setLoadingNft] = useState(true);
  const [loadingSbt, setLoadingSbt] = useState(true);

  // NFTコレクション情報を取得
  useEffect(() => {
    const fetchNftCollectionFeatures = async () => {
      try {
        setLoadingNft(true);
        console.log(`🔍 Fetching NFT collection features for ${TBA_TARGET_NFT_CA_ADDRESSES.length} contracts`);
        
        // 各コントラクトのコントラクト名とtotalSupplyを並行取得
        const contractPromises = TBA_TARGET_NFT_CA_ADDRESSES.map(async (address) => {
          try {
            const contractService = new NftContractService(address);
            const [contractName, totalSupply] = await Promise.all([
              contractService.getName(),
              contractService.getTotalSupply()
            ]);
            return {
              contractAddress: address,
              contractName: contractName || `NFT ${address.slice(0, 6)}...${address.slice(-4)}`,
              totalSupply: totalSupply || 0,
            };
          } catch (err) {
            console.warn(`Failed to fetch NFT contract info for ${address}:`, err);
            return {
              contractAddress: address,
              contractName: `NFT ${address.slice(0, 6)}...${address.slice(-4)}`,
              totalSupply: 0,
            };
          }
        });
        
        const results = await Promise.all(contractPromises);
        // totalSupplyが0より大きいコントラクトのみをフィルタリング
        const filteredResults = results.filter(result => result.totalSupply > 0);
        setNftCollectionFeatures(filteredResults);
        console.log(`✅ Fetched ${results.length} NFT contracts, ${filteredResults.length} with tokens`);
      } catch (err) {
        console.error("Failed to fetch NFT collection features:", err);
        setNftCollectionFeatures([]);
      } finally {
        setLoadingNft(false);
      }
    };

    fetchNftCollectionFeatures();
  }, []);

  // SBTコレクション情報を取得
  useEffect(() => {
    const fetchSbtCollectionFeatures = async () => {
      try {
        setSbtCollectionFeatures([]);
        
        if (TBA_TARGET_SBT_CA_ADDRESSES.length === 0) {
          setLoadingSbt(false);
          return;
        }
        
        setLoadingSbt(true);
        console.log(`🔍 Fetching SBT collection features for ${TBA_TARGET_SBT_CA_ADDRESSES.length} contracts`);
        
        // 各コントラクトのコントラクト名とtotalSupplyを並行取得
        const contractPromises = TBA_TARGET_SBT_CA_ADDRESSES.map(async (address) => {
          try {
            const contractService = new NftContractService(address);
            const [contractName, totalSupply] = await Promise.all([
              contractService.getName(),
              contractService.getTotalSupply()
            ]);
            return {
              contractAddress: address,
              contractName: contractName || `SBT ${address.slice(0, 6)}...${address.slice(-4)}`,
              totalSupply: totalSupply || 0,
            };
          } catch (err) {
            console.warn(`Failed to fetch SBT contract info for ${address}:`, err);
            return {
              contractAddress: address,
              contractName: `SBT ${address.slice(0, 6)}...${address.slice(-4)}`,
              totalSupply: 0,
            };
          }
        });
        
        const results = await Promise.all(contractPromises);
        // totalSupplyが0より大きいコントラクトのみをフィルタリング
        const filteredResults = results.filter(result => result.totalSupply > 0);
        setSbtCollectionFeatures(filteredResults);
        console.log(`✅ Fetched ${results.length} SBT contracts, ${filteredResults.length} with tokens`);
      } catch (err) {
        console.error("Failed to fetch SBT collection features:", err);
        setSbtCollectionFeatures([]);
      } finally {
        setLoadingSbt(false);
      }
    };

    fetchSbtCollectionFeatures();
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Collection</h1>
      <div className={styles.content}>
        {/* NFT Collection Features */}
        <div className={styles.placeholder}>
          <h3>Collection NFT Features</h3>
          {loadingNft ? (
            <div className={styles.loading}>Loading NFT collections...</div>
          ) : nftCollectionFeatures.length > 0 ? (
            <ul>
              {nftCollectionFeatures.map((feature) => (
                <li key={feature.contractAddress}>
                  <a href={`/tokens/${feature.contractAddress}`}>
                    <span>{feature.contractName}</span>
                    <span style={{ 
                      fontSize: '0.9em', 
                      opacity: 0.8, 
                      fontWeight: 'normal',
                      marginLeft: '8px'
                    }}>
                      ({feature.totalSupply})
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>No NFT collections configured</p>
          )}
        </div>

        {/* SBT Collection Features */}
        <div className={styles.placeholder}>
          <h3>Collection SBT Features</h3>
          {loadingSbt ? (
            <div className={styles.loading}>Loading SBT collections...</div>
          ) : sbtCollectionFeatures.length > 0 ? (
            <ul>
              {sbtCollectionFeatures.map((feature) => (
                <li key={feature.contractAddress}>
                  <a href={`/tokens/${feature.contractAddress}`}>
                    <span>{feature.contractName}</span>
                    <span style={{ 
                      fontSize: '0.9em', 
                      opacity: 0.8, 
                      fontWeight: 'normal',
                      marginLeft: '8px'
                    }}>
                      ({feature.totalSupply})
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>No SBT collections configured</p>
          )}
        </div>

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
      </div>
    </div>
  );
};
