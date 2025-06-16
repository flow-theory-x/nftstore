import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      include: '**/*.svg?react',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Ethers.js を単独チャンクに分離
          ethers: ['ethers'],
          // React関連ライブラリを分離
          react: ['react', 'react-dom', 'react-router-dom']
        }
      }
    },
    chunkSizeWarningLimit: 1000 // 1MB に上げる
  }
})
