import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { Layout } from './components/Layout';
import { RateLimitProvider, useRateLimit } from './contexts/RateLimitContext';
import { rateLimiter } from './utils/rateLimiter';

// 遅延読み込みでページコンポーネントを分割
const TokensPage = lazy(() => import('./pages/TokensPage').then(module => ({ default: module.TokensPage })));
const OwnedTokensPage = lazy(() => import('./pages/OwnedTokensPage').then(module => ({ default: module.OwnedTokensPage })));
const MintPage = lazy(() => import('./pages/MintPage').then(module => ({ default: module.MintPage })));
const TokenDetailPage = lazy(() => import('./pages/TokenDetailPage').then(module => ({ default: module.TokenDetailPage })));
const CollectionPage = lazy(() => import('./pages/CollectionPage').then(module => ({ default: module.CollectionPage })));

const AppContent: React.FC = () => {
  const { setRateLimit, incrementRetry } = useRateLimit();

  useEffect(() => {
    // RateLimiterのコールバックを設定
    rateLimiter.setRateLimitCallback(setRateLimit);
    rateLimiter.setRetryCallback(incrementRetry);
  }, [setRateLimit, incrementRetry]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/collection" replace />} />
          <Route path="tokens" element={
            <Suspense fallback={<div>Loading...</div>}>
              <TokensPage />
            </Suspense>
          } />
          <Route path="tokens/:contractAddress" element={
            <Suspense fallback={<div>Loading...</div>}>
              <TokensPage />
            </Suspense>
          } />
          <Route path="token/:tokenId" element={
            <Suspense fallback={<div>Loading...</div>}>
              <TokenDetailPage />
            </Suspense>
          } />
          <Route path="token/:contractAddress/:tokenId" element={
            <Suspense fallback={<div>Loading...</div>}>
              <TokenDetailPage />
            </Suspense>
          } />
          <Route path="own/:address" element={
            <Suspense fallback={<div>Loading...</div>}>
              <OwnedTokensPage />
            </Suspense>
          } />
          <Route path="own/:contractAddress/:address" element={
            <Suspense fallback={<div>Loading...</div>}>
              <OwnedTokensPage />
            </Suspense>
          } />
          <Route path="mint" element={
            <Suspense fallback={<div>Loading...</div>}>
              <MintPage />
            </Suspense>
          } />
          <Route path="mint/:contractAddress" element={
            <Suspense fallback={<div>Loading...</div>}>
              <MintPage />
            </Suspense>
          } />
          <Route path="collection" element={
            <Suspense fallback={<div>Loading...</div>}>
              <CollectionPage />
            </Suspense>
          } />
          <Route path="collection/:contractAddress" element={
            <Suspense fallback={<div>Loading...</div>}>
              <CollectionPage />
            </Suspense>
          } />
        </Route>
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <RateLimitProvider>
      <AppContent />
    </RateLimitProvider>
  );
}

export default App;
