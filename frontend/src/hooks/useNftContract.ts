import { useMemo } from 'react';
import { NftContractService } from '../utils/nftContract';
import { CONTRACT_ADDRESS } from '../constants';
import { useWallet } from './useWallet';

/**
 * NFTコントラクトサービスを提供するカスタムフック
 * @param contractAddress コントラクトアドレス（省略時はデフォルトを使用）
 * @param withSigner signerを含めるかどうか（署名が必要な操作の場合）
 */
export const useNftContract = (
  contractAddress?: string,
  withSigner: boolean = false
) => {
  const { getSigner } = useWallet();
  
  const contractService = useMemo(() => {
    const address = contractAddress || CONTRACT_ADDRESS;
    
    if (withSigner) {
      // 署名が必要な操作の場合（mint, burn, transfer等）
      return new NftContractService(address, getSigner());
    } else {
      // 読み取り専用操作の場合
      return new NftContractService(address);
    }
  }, [contractAddress, withSigner, getSigner]);

  return contractService;
};

/**
 * 複数のコントラクトサービスを管理するフック
 * @param contractAddresses コントラクトアドレスの配列
 */
export const useMultipleNftContracts = (contractAddresses: string[]) => {
  const contracts = useMemo(() => {
    const contractMap = new Map<string, NftContractService>();
    
    contractAddresses.forEach(address => {
      if (address && !contractMap.has(address)) {
        contractMap.set(address, new NftContractService(address));
      }
    });
    
    return contractMap;
  }, [contractAddresses]);

  return contracts;
};

/**
 * デフォルトコントラクトサービスを提供するフック
 */
export const useDefaultNftContract = (withSigner: boolean = false) => {
  return useNftContract(CONTRACT_ADDRESS, withSigner);
};