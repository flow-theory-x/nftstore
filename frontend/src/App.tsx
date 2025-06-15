import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TokensPage } from './pages/TokensPage';
import { OwnedTokensPage } from './pages/OwnedTokensPage';
import { MintPage } from './pages/MintPage';
import { TokenDetailPage } from './pages/TokenDetailPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/tokens" replace />} />
          <Route path="tokens" element={<TokensPage />} />
          <Route path="tokens/:contractAddress" element={<TokensPage />} />
          <Route path="token/:tokenId" element={<TokenDetailPage />} />
          <Route path="token/:contractAddress/:tokenId" element={<TokenDetailPage />} />
          <Route path="own/:address" element={<OwnedTokensPage />} />
          <Route path="own/:contractAddress/:address" element={<OwnedTokensPage />} />
          <Route path="mint" element={<MintPage />} />
          <Route path="mint/:contractAddress" element={<MintPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
