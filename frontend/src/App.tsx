import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Layout } from './components/Layout';

// 遅延読み込みでページコンポーネントを分割
const TokensPage = lazy(() => import('./pages/TokensPage').then(module => ({ default: module.TokensPage })));
const OwnedTokensPage = lazy(() => import('./pages/OwnedTokensPage').then(module => ({ default: module.OwnedTokensPage })));
const MintPage = lazy(() => import('./pages/MintPage').then(module => ({ default: module.MintPage })));
const TokenDetailPage = lazy(() => import('./pages/TokenDetailPage').then(module => ({ default: module.TokenDetailPage })));
const CollectionPage = lazy(() => import('./pages/CollectionPage').then(module => ({ default: module.CollectionPage })));
const CollectionCreatorPage = lazy(() => import('./pages/CollectionCreatorPage').then(module => ({ default: module.CollectionCreatorPage })));
const CreatorPage = lazy(() => import('./pages/CreatorPage').then(module => ({ default: module.CreatorPage })));

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <Suspense fallback={<div>Loading...</div>}>
              <CollectionPage />
            </Suspense>
          } />
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
          <Route path="own" element={
            <Suspense fallback={<div>Loading...</div>}>
              <OwnedTokensPage />
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
          <Route path="creator" element={
            <Suspense fallback={<div>Loading...</div>}>
              <CollectionCreatorPage />
            </Suspense>
          } />
          <Route path="creator/:creatorAddress" element={
            <Suspense fallback={<div>Loading...</div>}>
              <CreatorPage />
            </Suspense>
          } />
          {/* 後方互換性のためのリダイレクト */}
          <Route path="collection" element={<Navigate to="/" replace />} />
          <Route path="collection/creator" element={<Navigate to="/creator" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;