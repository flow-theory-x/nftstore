import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      include: "**/*.svg?react",
    }),
  ],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // CA Casher API のプロキシ設定（開発時のCORS回避用）
      "/api/ca-casher": {
        target: "https://web3.bon-soleil.com/nftcash",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ca-casher/, ""),
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("CA Casher proxy error:", err);
          });
          proxy.on("proxyReq", (_proxyReq, req, _res) => {
            console.log("CA Casher proxy request:", req.method, req.url);
          });
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Ethers.js を単独チャンクに分離
          ethers: ["ethers"],
          // React関連ライブラリを分離
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // 1MB に上げる
  },
});
