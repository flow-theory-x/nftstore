import { useState, useEffect, useCallback } from 'react';
import { eoaAddressNameResolver } from '../utils/eoaAddressNameResolver';
import type { AddressNameInfo, MemberInfo, TBAInfo } from '../types';

export interface UseAddressInfoReturn {
  addressInfo: AddressNameInfo | null;
  displayName: string;
  creatorName: string;
  memberInfo: MemberInfo | null;
  tbaInfo: TBAInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAddressInfo(address: string | null | undefined): UseAddressInfoReturn {
  const [addressInfo, setAddressInfo] = useState<AddressNameInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveAddress = useCallback(async (addr: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await eoaAddressNameResolver.resolveAddressToDisplayName(addr);
      setAddressInfo(result);
      setError(result.error);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error(`❌ useAddressInfo error for ${addr}:`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (address) {
      await resolveAddress(address);
    }
  }, [address, resolveAddress]);

  useEffect(() => {
    if (address?.trim()) {
      resolveAddress(address.trim());
    } else {
      setAddressInfo(null);
      setLoading(false);
      setError(null);
    }
  }, [address, resolveAddress]);

  const displayName = addressInfo?.displayName || eoaAddressNameResolver.formatAddress(address || '');
  const creatorName = addressInfo?.creatorName || '';
  const memberInfo = addressInfo?.memberInfo || null;
  const tbaInfo = addressInfo?.tbaInfo || null;

  return {
    addressInfo,
    displayName,
    creatorName,
    memberInfo,
    tbaInfo,
    loading,
    error,
    refresh
  };
}

export interface UseMultipleAddressInfoReturn {
  addressInfoMap: Map<string, AddressNameInfo>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMultipleAddressInfo(addresses: string[]): UseMultipleAddressInfoReturn {
  const [addressInfoMap, setAddressInfoMap] = useState<Map<string, AddressNameInfo>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveAddresses = useCallback(async (addrs: string[]) => {
    if (addrs.length === 0) {
      setAddressInfoMap(new Map());
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await eoaAddressNameResolver.resolveBatch(addrs);
      setAddressInfoMap(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ useMultipleAddressInfo error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await resolveAddresses(addresses);
  }, [addresses, resolveAddresses]);

  useEffect(() => {
    const filteredAddresses = addresses.filter(addr => addr?.trim());
    resolveAddresses(filteredAddresses);
  }, [addresses, resolveAddresses]);

  return {
    addressInfoMap,
    loading,
    error,
    refresh
  };
}

export function useOwnerAndCreatorInfo(owner?: string, creator?: string) {
  const ownerInfo = useAddressInfo(owner);
  const creatorInfo = useAddressInfo(creator);

  return {
    owner: ownerInfo,
    creator: creatorInfo,
    loading: ownerInfo.loading || creatorInfo.loading,
    error: ownerInfo.error || creatorInfo.error,
    refresh: async () => {
      await Promise.all([ownerInfo.refresh(), creatorInfo.refresh()]);
    }
  };
}