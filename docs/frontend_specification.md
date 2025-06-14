# NFT ストア-フロントエンド仕様書

## 概要

NFT ストア-フロントエンドは、NFT（Non-Fungible Token）の作成、管理、取引のためのスマートコントラクトを操作するフロントエンドです。

## ライセンス

MIT License

## スマートコントラクトアドレス

0xD3Bcde6894c4c79517a57f50BDA141B1a32ecE38

## ネットワーク

polygon(137)

## 機能

### 1. tokens (`/tokens`)

トークン一覧表示

### 2. own (`/own/{EOA}`)

所持トークン一覧表示

### 3. mint (`/mint`)

getMintFee() で金額を取得し、その値を value にセットして mint メソッドを実行するトランザクションを発行する

## 技術スタック

- **Frontend**: React 19 + TypeScript
- **Runtime**: Node.js 16+ または Bun 1.0+
- **wallet**: ethers + metamask
- **Package Manager**: bun
- **Bundler**: Vite
- **Routing**: React Router DOM
- **Styling**: CSS Modules
