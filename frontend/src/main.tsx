import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { memoryMonitor } from './utils/memoryMonitor'

// グローバルメモリ監視を開始
memoryMonitor.start();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
