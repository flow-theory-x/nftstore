# NFT Store Frontend

A modern React application for interacting with NFT Store smart contracts. Features wallet integration, real-time metadata preview, and progressive loading for optimal user experience.

## 🚀 Features

### Core Functionality

- **📋 All Tokens** (`/tokens`) - Browse all NFTs with progressive loading (3 items at a time)
- **👤 Owned Tokens** (`/own/{address}`) - View NFTs owned by a specific address
- **⚡ Mint NFT** (`/mint`) - Mint new NFTs with live metadata preview
- **🔥 Burn NFT** - Token owners can burn their NFTs (confirmation required)
- **↔️ Transfer NFT** - Token owners can transfer NFTs to other addresses
- **🎒 TBA Support** - Token Bound Account creation and management
- **🔗 OpenSea Integration** - Direct links to view NFTs on OpenSea

### User Experience

- **💳 Wallet Integration** - MetaMask support with auto-network switching
- **🎨 Live Metadata Preview** - Real-time preview when entering metadata URLs
- **📱 Responsive Design** - Works seamlessly on desktop and mobile
- **⚡ Progressive Loading** - Smooth performance even with hundreds of NFTs
- **📋 One-Click Copy** - Click owner addresses to copy to clipboard
- **🔄 Smart Loading** - Animated spinners with configurable sizes
- **👥 Member Information** - Rich owner information display with avatars
- **⏱️ Rate Limiting** - Smart request management with user feedback

### Technical Features

- **🌍 Multi-Network Support** - Configurable for different blockchains
- **⚙️ Environment Configuration** - Easy deployment across different environments
- **🔒 Security** - Owner-only burn functionality with proper validation
- **🎯 Error Handling** - User-friendly error messages and confirmations
- **🚦 Rate Limiting** - Automated queue-based request management
- **🎭 Avatar Integration** - Member avatar display in owner information
- **📊 TBA Asset Management** - View and manage Token Bound Account assets

## 🛠 Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Blockchain**: ethers.js v6
- **Routing**: React Router DOM
- **Styling**: CSS Modules
- **Package Manager**: Bun/npm

## 📦 Setup

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your contract details
   ```

3. **Start development server:**

   ```bash
   bun run dev
   ```

4. **Build for production:**
   ```bash
   bun run build
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Contract Configuration
VITE_CHAIN_ID=137
VITE_CHAIN_NAME=Matic
VITE_RPC_URL=https://polygon-rpc.com

# Currency Settings
VITE_CURRENCY_NAME=MATIC
VITE_CURRENCY_SYMBOL=MATIC

# OpenSea Integration
VITE_OPENSEA_NETWORK=matic
VITE_OPENSEA_BASE_URL=https://opensea.io/assets
```

### Supported Networks

**Polygon (Default):**

- Chain ID: 137
- Currency: MATIC
- OpenSea: `/matic`

**Ethereum:**

- Chain ID: 1
- Currency: ETH
- OpenSea: `/ethereum`

## 🎯 Usage

### For Users

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Browse NFTs**: View all NFTs in the collection with progressive loading
3. **Mint NFTs**:
   - Enter metadata URL
   - Preview content automatically loads
   - Confirm mint with required fee
4. **Manage NFTs**:
   - View your owned tokens (auto-redirected after wallet connection)
   - Burn tokens you own (with confirmation)
   - Copy owner addresses to clipboard
   - Open NFTs on OpenSea

### For Developers

#### Progressive Loading

```typescript
// Automatically loads 3 NFTs at a time with 500ms intervals
// No user interaction required - seamless experience
```

#### Metadata Preview

```typescript
// Real-time preview with 500ms debounce
// Validates JSON structure before allowing mint
```

#### Multi-Network Support

```typescript
// Switch networks by updating .env file
// No code changes required
```

## 🏗 Architecture

### Core Components

- `NFTCard` - Displays individual NFT with metadata, actions, and owner info
- `WalletConnect` - Handles wallet connection and network switching
- `Layout` - Navigation and responsive layout
- `Spinner` - Configurable loading indicators (small/medium/large)
- `MemberInfoCard` - Rich member information display with status and roles
- `RateLimitNotification` - User-friendly rate limiting feedback

### Pages

- `TokensPage` - Progressive loading of all NFTs with spinner integration
- `OwnedTokensPage` - User's NFT collection
- `MintPage` - NFT creation with live preview
- `TokenDetailPage` - Detailed NFT view with owner information and TBA support

### Services & Utilities

- `NftContractService` - Smart contract interaction with rate limiting
- `MemberService` - External API integration for member information
- `TbaService` - Token Bound Account management
- `RateLimiter` - Queue-based request management with retry logic
- `RateLimitContext` - Global state management for rate limiting

## 🔧 Development

### Performance Optimizations

- Progressive loading prevents UI freezing with large collections
- Metadata fetching with error handling and fallbacks
- Responsive image loading with placeholder states
- Efficient re-rendering with proper React hooks
- **Queue-based Rate Limiting** - Prevents API overload with automatic retry
- **Intelligent Caching** - Member information caching for improved performance
- **Concurrent Request Management** - Batched API calls with controlled concurrency

### Security Features

- Owner validation for burn and transfer operations
- Network verification before transactions
- Proper error handling for failed operations
- Confirmation dialogs for destructive actions
- **Rate Limiting Protection** - Prevents abuse with exponential backoff
- **TBA Security** - Secure Token Bound Account creation and management
- **Address Validation** - Multiple address format support with checksum validation

### Build Optimizations

- Vite for fast development and optimized builds
- CSS Modules for scoped styling
- TypeScript for type safety
- Environment-based configuration

## 📱 Browser Support

- Modern browsers with ES2020+ support
- MetaMask extension required for wallet functionality
- Responsive design for mobile and desktop

## 🚀 Deployment

The application includes:

- `.htaccess` for Apache servers with SPA routing support
- Content Security Policy configuration
- Optimized build output with code splitting
- Environment variable support for different deployments

### Build Commands

```bash
# Type checking (passes)
npm run typecheck

# Development server
npm run dev

# Production build
npm run build
```

**Note**: The project currently has some ESLint warnings related to `any` types and unused variables. These are non-blocking and can be addressed in future iterations while maintaining functionality.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the NFT Store smart contract system.
