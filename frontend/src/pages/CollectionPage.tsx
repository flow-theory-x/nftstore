import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { TBA_TARGET_NFT_CA_ADDRESSES, TBA_TARGET_SBT_CA_ADDRESSES } from "../constants";
import { NftContractService } from "../utils/nftContract";
import { Spinner } from "../components/Spinner";
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
  const [sbtZeroSupplyFeatures, setSbtZeroSupplyFeatures] = useState<{
    contractAddress: string;
    contractName: string;
    totalSupply: number;
  }[]>([]);
  const [loadingNft, setLoadingNft] = useState(true);
  const [loadingSbt, setLoadingSbt] = useState(true);
  const [nftLoadingMessage, setNftLoadingMessage] = useState("Loading NFT collections...");
  const [sbtLoadingMessage, setSbtLoadingMessage] = useState("Loading SBT collections...");

  // NFTコレクション情報を取得
  useEffect(() => {
    const fetchNftCollectionFeatures = async () => {
      try {
        setLoadingNft(true);
        console.log(`🔍 Fetching NFT collection features for ${TBA_TARGET_NFT_CA_ADDRESSES.length} contracts`);
        
        setNftLoadingMessage(`Processing ${TBA_TARGET_NFT_CA_ADDRESSES.length} NFT contracts...`);
        
        // Process each contract sequentially to show progress
        const results = [];
        for (let i = 0; i < TBA_TARGET_NFT_CA_ADDRESSES.length; i++) {
          const address = TBA_TARGET_NFT_CA_ADDRESSES[i];
          const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
          
          try {
            setNftLoadingMessage(`Connecting to contract ${i + 1}/${TBA_TARGET_NFT_CA_ADDRESSES.length}: ${shortAddress}`);
            const contractService = new NftContractService(address);
            
            setNftLoadingMessage(`Getting name for ${shortAddress}...`);
            const contractName = await contractService.getName();
            
            setNftLoadingMessage(`Getting supply for ${shortAddress}...`);
            const totalSupply = await contractService.getTotalSupply();
            
            results.push({
              contractAddress: address,
              contractName: contractName || `NFT ${shortAddress}`,
              totalSupply: totalSupply || 0,
            });
          } catch (err) {
            console.warn(`Failed to fetch NFT contract info for ${address}:`, err);
            results.push({
              contractAddress: address,
              contractName: `NFT ${shortAddress}`,
              totalSupply: 0,
            });
          }
        }
        
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
        
        setSbtLoadingMessage(`Processing ${TBA_TARGET_SBT_CA_ADDRESSES.length} SBT contracts...`);
        
        // Process each contract sequentially to show progress
        const results = [];
        for (let i = 0; i < TBA_TARGET_SBT_CA_ADDRESSES.length; i++) {
          const address = TBA_TARGET_SBT_CA_ADDRESSES[i];
          const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
          
          try {
            setSbtLoadingMessage(`Connecting to contract ${i + 1}/${TBA_TARGET_SBT_CA_ADDRESSES.length}: ${shortAddress}`);
            const contractService = new NftContractService(address);
            
            setSbtLoadingMessage(`Getting name for ${shortAddress}...`);
            const contractName = await contractService.getName();
            
            setSbtLoadingMessage(`Getting supply for ${shortAddress}...`);
            const totalSupply = await contractService.getTotalSupply();
            
            results.push({
              contractAddress: address,
              contractName: contractName || `SBT ${shortAddress}`,
              totalSupply: totalSupply || 0,
            });
          } catch (err) {
            console.warn(`Failed to fetch SBT contract info for ${address}:`, err);
            results.push({
              contractAddress: address,
              contractName: `SBT ${shortAddress}`,
              totalSupply: 0,
            });
          }
        }
        
        // totalSupplyが0より大きいコントラクトと0のコントラクトを分離
        const filteredResults = results.filter(result => result.totalSupply > 0);
        const zeroSupplyResults = results.filter(result => result.totalSupply === 0);
        setSbtCollectionFeatures(filteredResults);
        setSbtZeroSupplyFeatures(zeroSupplyResults);
        console.log(`✅ Fetched ${results.length} SBT contracts, ${filteredResults.length} with tokens, ${zeroSupplyResults.length} with zero supply`);
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
            <Spinner size="medium" text={nftLoadingMessage} />
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
            <Spinner size="medium" text={sbtLoadingMessage} />
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
            <p>No SBT collections with tokens</p>
          )}
        </div>

        {/* Zero Supply SBT Collections */}
        {sbtZeroSupplyFeatures.length > 0 && (
          <div className={styles.placeholder} style={{ 
            backgroundColor: '#fff5f5', 
            borderColor: '#fed7d7',
            borderWidth: '1px',
            borderStyle: 'solid'
          }}>
            <h3 style={{ color: '#c53030' }}>Collections with Zero Supply</h3>
            <ul>
              {sbtZeroSupplyFeatures.map((feature) => (
                <li key={feature.contractAddress}>
                  <a href={`/mint/${feature.contractAddress}`} style={{ 
                    color: '#e53e3e',
                    opacity: 0.8
                  }}>
                    <span>{feature.contractName}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

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
