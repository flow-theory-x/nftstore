import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CONTRACT_ADDRESS } from "../constants";
import { NftContractService } from "../utils/nftContract";
import { Spinner } from "../components/Spinner";
import styles from "./CollectionPage.module.css";

interface ContractInfo {
  contractAddress: string;
  contractName: string;
  totalSupply: number;
  symbol: string;
  owner: string;
  maxFeeRate: number;
  mintFee: string;
  creators: string[];
}

export const CollectionPage: React.FC = () => {
  const { contractAddress } = useParams<{ contractAddress?: string }>();
  const [nftCollectionFeatures, setNftCollectionFeatures] = useState<{
    contractAddress: string;
    contractName: string;
    totalSupply: number;
  }[]>([]);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [loadingNft, setLoadingNft] = useState(true);
  const [loadingContractInfo, setLoadingContractInfo] = useState(true);
  const [nftLoadingMessage, setNftLoadingMessage] = useState("Loading NFT collections...");

  // NFTコレクション情報を取得
  useEffect(() => {
    const fetchNftCollectionFeatures = async () => {
      try {
        setLoadingNft(true);
        console.log(`🔍 Fetching NFT collection features for contract: ${CONTRACT_ADDRESS}`);
        
        setNftLoadingMessage(`Processing NFT contract...`);
        
        const address = CONTRACT_ADDRESS;
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
        
        try {
          setNftLoadingMessage(`Connecting to contract: ${shortAddress}`);
          const contractService = new NftContractService(address);
          
          setNftLoadingMessage(`Getting name for ${shortAddress}...`);
          const contractName = await contractService.getName();
          
          setNftLoadingMessage(`Getting supply for ${shortAddress}...`);
          const totalSupply = await contractService.getTotalSupply();
          
          const result = {
            contractAddress: address,
            contractName: contractName || `NFT ${shortAddress}`,
            totalSupply: totalSupply || 0,
          };
          
          // totalSupplyが0より大きい場合のみ追加
          if (result.totalSupply > 0) {
            setNftCollectionFeatures([result]);
            console.log(`✅ Fetched NFT contract with ${result.totalSupply} tokens`);
          } else {
            setNftCollectionFeatures([]);
            console.log(`❌ NFT contract has no tokens`);
          }
        } catch (err) {
          console.warn(`Failed to fetch NFT contract info for ${address}:`, err);
          setNftCollectionFeatures([]);
        }
      } catch (err) {
        console.error("Failed to fetch NFT collection features:", err);
        setNftCollectionFeatures([]);
      } finally {
        setLoadingNft(false);
      }
    };

    fetchNftCollectionFeatures();
  }, []);

  // コントラクト詳細情報を取得
  useEffect(() => {
    const fetchContractInfo = async () => {
      try {
        setLoadingContractInfo(true);
        console.log(`🔍 Fetching detailed contract info for: ${CONTRACT_ADDRESS}`);
        
        const contractService = new NftContractService(CONTRACT_ADDRESS);
        
        const [
          contractName,
          symbol,
          totalSupply,
          maxFeeRate,
          mintFee,
          contractInfoData,
          creators
        ] = await Promise.all([
          contractService.getName().catch(() => "Unknown"),
          (contractService.contract as any).symbol().catch(() => "Unknown"),
          contractService.getTotalSupply().catch(() => 0),
          contractService.getMaxFeeRate().catch(() => 0),
          contractService.getMintFee().catch(() => "0"),
          contractService.getContractInfo().catch(() => ({ creator: "Unknown" })),
          contractService.getCreators().catch(() => [])
        ]);

        setContractInfo({
          contractAddress: CONTRACT_ADDRESS,
          contractName: contractName || "Unknown",
          symbol: symbol || "Unknown",
          totalSupply: totalSupply || 0,
          owner: contractInfoData.creator || "Unknown",
          maxFeeRate: maxFeeRate || 0,
          mintFee: mintFee || "0",
          creators: creators || []
        });

        console.log(`✅ Fetched contract info:`, {
          name: contractName,
          symbol,
          totalSupply,
          maxFeeRate,
          mintFee
        });
      } catch (err) {
        console.error("Failed to fetch contract info:", err);
        setContractInfo(null);
      } finally {
        setLoadingContractInfo(false);
      }
    };

    fetchContractInfo();
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


        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Collection Information</h2>
          {loadingContractInfo ? (
            <Spinner size="medium" text="Loading contract information..." />
          ) : contractInfo ? (
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Contract Address:</span>
                <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                  {contractInfo.contractAddress}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Collection Name:</span>
                <span className={styles.infoValue}>{contractInfo.contractName}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Symbol:</span>
                <span className={styles.infoValue}>{contractInfo.symbol}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Total Supply:</span>
                <span className={styles.infoValue}>{contractInfo.totalSupply.toLocaleString()}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Contract Owner:</span>
                <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                  {contractInfo.owner.slice(0, 6)}...{contractInfo.owner.slice(-4)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Max Royalty Fee Rate:</span>
                <span className={styles.infoValue}>
                  {contractInfo.maxFeeRate / 100}% ({contractInfo.maxFeeRate} basis points)
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Mint Fee:</span>
                <span className={styles.infoValue}>
                  {contractInfo.mintFee} {import.meta.env.VITE_CURRENCY_SYMBOL || 'ETH'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Total Creators:</span>
                <span className={styles.infoValue}>{contractInfo.creators.length}</span>
              </div>
              {contractInfo.creators.length > 0 && (
                <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.infoLabel}>Creators:</span>
                  <div className={styles.infoValue}>
                    {contractInfo.creators.map((creator, index) => (
                      <div key={creator} style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.9em',
                        marginBottom: index < contractInfo.creators.length - 1 ? '4px' : '0'
                      }}>
                        {creator.slice(0, 6)}...{creator.slice(-4)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>Failed to load contract information</p>
          )}
        </div>
      </div>
    </div>
  );
};
