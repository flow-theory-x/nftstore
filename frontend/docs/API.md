# API Documentation

## Member Service API

The NFT Store frontend integrates with an external member service to display rich owner information for NFT holders.

### Base URL

```
https://ehfm6q914a.execute-api.ap-northeast-1.amazonaws.com/member
```

### Endpoints

#### Get Member Information

**GET** `/member/{address}`

Retrieves member information for a given Ethereum address.

**Parameters:**
- `address` (string): Ethereum address in any format (checksummed, lowercase, or original)

**Response:**

```json
{
  "address": "0x742d35Cc6235B...",
  "Nick": "Username",
  "Name": "Display Name", 
  "Username": "handle",
  "Icon": "https://example.com/avatar.jpg",
  "DiscordId": "123456789",
  "Roles": [
    {"name": "Premium", "id": "role1"},
    {"name": "Verified", "id": "role2"}
  ],
  "Expired": "2024-12-31T23:59:59Z",
  "Updated": "2024-01-15T10:30:00Z",
  "DeleteFlag": false
}
```

**Error Responses:**

- `404 Not Found`: Member not found
- `500 Internal Server Error`: API error

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Original Ethereum address |
| `Nick` | string | Preferred display name |
| `Name` | string | Full name |
| `Username` | string | Handle/username |
| `Icon` | string | Avatar image URL |
| `avatar_url` | string | Alternative avatar field |
| `DiscordId` | string | Discord user ID |
| `Roles` | array | User roles and permissions |
| `Expired` | string | Membership expiration date |
| `Updated` | string | Last update timestamp |
| `DeleteFlag` | boolean | Soft delete flag |

### Implementation Details

#### Address Format Handling

The service automatically tries multiple address formats:
1. Original address (as provided)
2. Lowercase address
3. EIP-55 checksummed address

#### Rate Limiting

The service implements intelligent rate limiting:
- Batch size: 3 concurrent requests
- Delay between batches: 100ms
- Automatic retry with exponential backoff

#### Error Handling

- Network errors are logged and return `null`
- 404 responses are treated as "member not found"
- Invalid addresses are handled gracefully

### Usage Example

```typescript
import { memberService } from '../utils/memberService';

// Get single member info
const memberInfo = await memberService.getMemberInfo('0x742d35Cc6235B...');

// Get multiple members (batched)
const memberInfos = await memberService.getMemberInfoBatch([
  '0x742d35Cc6235B...',
  '0x8ba1f109551bD...',
  '0x123456789abcd...'
]);
```

## Rate Limiting System

### Overview

The application implements a sophisticated rate limiting system to prevent API overload and ensure reliable operation.

### Features

- **Queue-based Processing**: Requests are queued and processed sequentially
- **Automatic Retry**: Failed requests are automatically retried with exponential backoff
- **Error Detection**: Intelligent detection of rate limit errors
- **User Feedback**: Real-time notifications with countdown timers

### Configuration

```typescript
class RateLimiter {
  private minDelay = 100;           // Minimum delay between requests (ms)
  private rateLimitDelay = 10000;   // Delay when rate limited (ms)
  private maxRetries = 3;           // Maximum retry attempts
}
```

### Error Detection

The system detects rate limiting through:
- HTTP status codes (429, 503)
- Error messages containing rate limit keywords
- Network timeout errors

### User Interface

When rate limiting is active:
- Notification banner appears at top of screen
- Countdown timer shows remaining wait time
- Current retry attempt displayed
- Automatic dismissal when resolved

## TBA (Token Bound Account) Integration

### Overview

The application supports Token Bound Accounts (ERC-6551) for NFTs, allowing tokens to own other assets.

### Features

- **Account Creation**: Create TBA accounts for owned NFTs
- **Asset Management**: View NFTs owned by TBA accounts
- **Multi-Contract Support**: Search across multiple contract addresses
- **Balance Display**: Show ETH/MATIC balance in TBA accounts

### Configuration

TBA target contracts are configured in constants:

```typescript
// NFT contracts to search for TBA-owned tokens
export const TBA_TARGET_NFT_CA_ADDRESSES = [
  "0x123...",
  "0x456..."
];

// SBT contracts (non-transferable)
export const TBA_TARGET_SBT_CA_ADDRESSES = [
  "0x789...",
  "0xabc..."
];
```

### Account Detection

The system uses fallback detection methods when TBA service methods are unavailable:

```typescript
// Conservative approach - assumes EOA unless proven otherwise
const isTBA = false; // Currently safe default
```

### Asset Discovery

TBA-owned assets are discovered through:
1. Event log scanning
2. Balance queries across target contracts
3. Metadata resolution for found tokens
4. Parallel processing for performance

## Error Handling

### Philosophy

The application follows a defensive programming approach:
- Graceful degradation when services are unavailable
- User-friendly error messages
- Automatic retry for transient failures
- Fallback behavior for missing data

### Error Categories

1. **Network Errors**: Connection failures, timeouts
2. **API Errors**: Service unavailable, invalid responses
3. **Blockchain Errors**: Transaction failures, network issues
4. **Validation Errors**: Invalid addresses, malformed data

### Recovery Strategies

- **Automatic Retry**: For transient network issues
- **Fallback Data**: Use cached or default values
- **User Notification**: Clear error messages with next steps
- **Graceful Degradation**: Core functionality remains available

## Caching Strategy

### Member Information

- In-memory caching during session
- Cache invalidation on address change
- Batch loading for improved performance

### Metadata

- Browser cache for images and media
- Local storage for frequently accessed data
- Cache busting for updated content

### Rate Limiting State

- Context-based state management
- Persistent across component re-renders
- Automatic cleanup on resolution