# NFT Store

A Solidity smart contract for creating and managing NFT stores with royalty support.

## Features

- **ERC721 Compatible**: Full compliance with ERC721 standard with enumerable extension
- **Royalty Standard**: Implements ERC-2981 royalty standard for creator fees
- **Creator Control**: Configurable creator-only minting restrictions
- **Mint Fees**: Adjustable mint fees for NFT creation
- **Metadata Management**: Custom metadata URL support for each token
- **Burn Support**: Token burning functionality
- **Withdrawal**: Contract balance withdrawal for owners/creators

## Contracts

### NftStore.sol
Main NFT store contract that extends ERC721Enumerable and RoyaltyStandard.

**Key Functions:**
- `mint(address to, string metaUrl)` - Mint new NFTs with metadata
- `burn(uint256 tokenId)` - Burn existing tokens
- `config(address creator, uint256 feeRate, bool creatorOnly)` - Configure store settings
- `setMintFee(uint256 mintFee)` - Set mint fee amount
- `withdraw()` - Withdraw contract balance

### RoyaltyStandard.sol
Abstract contract implementing ERC-2981 royalty standard.

**Features:**
- Per-token royalty configuration
- Standard royalty calculation (basis points)
- ERC-165 interface support

## Deployment

Constructor parameters for NftStore:
- `name` - NFT collection name
- `symbol` - NFT collection symbol  
- `creator` - Creator address for royalties
- `feeRate` - Royalty fee rate in percentage

## License

Apache License 2.0