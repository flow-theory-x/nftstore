# Feature Documentation

## Overview

This document provides detailed information about the key features implemented in the NFT Store frontend application.

## Core Features

### 1. Spinner Component

**Location:** `src/components/Spinner.tsx`

A configurable loading indicator component used throughout the application.

**Features:**
- Three size variants: `small`, `medium`, `large`
- Optional text display
- CSS animations with smooth transitions
- Responsive design
- Dark mode support

**Usage:**
```tsx
import { Spinner } from '../components/Spinner';

// Basic usage
<Spinner />

// With custom size and text
<Spinner size="large" text="Loading NFTs..." />

// With custom styling
<Spinner size="small" className="custom-spinner" />
```

**Implementation Details:**
- Uses CSS keyframe animations for smooth rotation
- Modular CSS for easy customization
- Minimal performance impact
- Accessible with proper ARIA attributes

### 2. Rate Limiting System

**Location:** `src/utils/rateLimiter.ts`, `src/contexts/RateLimitContext.tsx`

A comprehensive rate limiting system that prevents API overload and provides user feedback.

**Features:**
- Queue-based request processing
- Automatic retry with exponential backoff
- Intelligent error detection
- User-friendly notifications
- Real-time countdown display

**Architecture:**
```typescript
RateLimiter (Singleton)
├── Request Queue Management
├── Error Detection & Retry Logic
├── Rate Limit State Management
└── User Notification System
```

**Usage:**
```tsx
// In a service
const rateLimiter = RateLimiter.getInstance();
const result = await rateLimiter.executeWithRetry(
  () => apiCall(),
  3, // maxRetries
  1000 // retryDelay
);

// In a component
const { isRateLimited, retryCount, nextRetryTime } = useRateLimit();
```

**Error Detection:**
- HTTP status codes: 429 (Too Many Requests), 503 (Service Unavailable)
- Error message patterns: "rate limit", "too many requests"
- Network timeout errors
- Connection failures

**User Experience:**
- Non-intrusive notification banner
- Clear countdown timer
- Retry progress indicator
- Automatic dismissal when resolved

### 3. Member Information System

**Location:** `src/utils/memberService.ts`, `src/components/MemberInfoCard.tsx`

Rich member information display system that integrates with external APIs to show detailed owner information.

**Features:**
- External API integration
- Multiple address format support
- Avatar display with fallbacks
- Role and status management
- Responsive design
- Caching and performance optimization

**API Integration:**
```typescript
// Service handles multiple address formats
const addressesToTry = [
  address,                      // Original format
  address.toLowerCase(),        // Lowercase
  this.toChecksumAddress(address) // EIP-55 checksum
];
```

**Member Information Display:**
- **Profile Section:** Avatar, display name, username
- **Status Badge:** Active, Expired, or Deleted status
- **Information Grid:** Discord ID, roles, expiration date
- **Address Section:** Wallet address with copy functionality

**Data Fields:**
```typescript
interface MemberInfo {
  address: string;
  Nick?: string;           // Display name
  Name?: string;           // Full name
  Username?: string;       // Handle
  Icon?: string;           // Avatar URL
  DiscordId?: string;      // Discord ID
  Roles?: Role[];          // User roles
  Expired?: string;        // Expiration date
  Updated?: string;        // Last update
  DeleteFlag?: boolean;    // Soft delete flag
}
```

**Performance Features:**
- Batch API calls with controlled concurrency
- Intelligent caching during session
- Graceful degradation when API unavailable
- Automatic retry for failed requests

### 4. Token Bound Account (TBA) Support

**Location:** `src/utils/tbaService.ts`, `src/pages/TokenDetailPage.tsx`

Comprehensive Token Bound Account (ERC-6551) support allowing NFTs to own other assets.

**Features:**
- TBA account creation for owned NFTs
- Multi-contract asset discovery
- Balance display (ETH/MATIC)
- Owned NFT management
- Cross-contract asset viewing

**TBA Workflow:**
1. **Account Detection:** Check if NFT has associated TBA
2. **Account Creation:** Owner can create TBA if not exists
3. **Asset Discovery:** Search for NFTs owned by TBA across contracts
4. **Asset Display:** Show owned NFTs with metadata
5. **Balance Management:** Display native token balance

**Configuration:**
```typescript
// Target contracts for TBA asset search
export const TBA_TARGET_NFT_CA_ADDRESSES = [
  "0x123...", // NFT Contract 1
  "0x456..."  // NFT Contract 2
];

export const TBA_TARGET_SBT_CA_ADDRESSES = [
  "0x789...", // SBT Contract 1
  "0xabc..."  // SBT Contract 2
];
```

**Asset Discovery Process:**
- Parallel contract scanning
- Event log analysis
- Balance verification
- Metadata resolution
- Performance optimization with batching

### 5. Enhanced Token Detail Page

**Location:** `src/pages/TokenDetailPage.tsx`

Comprehensive token detail view with rich information display and interactive features.

**Features:**
- Multi-media support (images, videos, 3D models, YouTube)
- Owner information with member integration
- TBA support and management
- Transfer and burn functionality
- Attribute display with preview
- OpenSea integration

**Media Support:**
- **Images:** Standard formats with fallbacks
- **Videos:** HTML5 video player with controls
- **3D Models:** ModelViewer integration for GLTF/GLB
- **YouTube:** Embedded player with ID extraction
- **External Links:** Safe link handling

**Owner Information:**
- Member avatar display in owner property
- Full member information card below token details
- TBA detection and special handling
- Link to owner's token collection

**Interactive Features:**
- One-click copy for addresses and IDs
- Transfer modal for owners
- Burn functionality with confirmation
- TBA account creation
- OpenSea direct links

### 6. Progressive Loading Enhancement

**Location:** `src/pages/TokensPage.tsx`

Improved progressive loading system with spinner integration and better user experience.

**Features:**
- Batch loading (3 tokens at a time)
- Configurable intervals (500ms default)
- Integrated spinner feedback
- Error handling with retries
- Performance monitoring
- User cancellation support

**Loading States:**
- **Initial Load:** Large spinner with "Loading tokens..." text
- **Progressive Load:** Small spinner during batch loading
- **Error State:** Error message with retry option
- **Empty State:** Helpful message when no tokens exist

**Performance Optimization:**
- Non-blocking UI updates
- Memory efficient batch processing
- Automatic cleanup on component unmount
- Debounced state updates

## Feature Integration

### Cross-Feature Communication

**Rate Limiting Integration:**
- All API services use rate limiter
- Blockchain calls are rate limited
- User feedback is coordinated
- Retry logic is centralized

**Member Information Integration:**
- Owner displays show member avatars
- Rich member cards appear throughout app
- Caching reduces API calls
- Graceful fallbacks when unavailable

**TBA Integration:**
- Token detail pages show TBA status
- TBA-owned assets are displayed
- Member information respects TBA owners
- Transfer restrictions for SBT contracts

### State Management

**Global State (Context):**
- `RateLimitContext`: Rate limiting state and notifications
- `WalletContext`: Wallet connection and blockchain state

**Component State:**
- Loading states for async operations
- Form states for user inputs
- UI states for modals and interactions

**Derived State:**
- Computed values from blockchain data
- Filtered and sorted lists
- Formatted display values

## Future Enhancements

### Planned Features

1. **Advanced Search:** Filter and search capabilities
2. **Batch Operations:** Multiple token operations
3. **Metadata Editing:** Owner metadata updates
4. **Social Features:** Comments and likes
5. **Analytics:** Usage statistics and insights

### Technical Improvements

1. **Offline Support:** PWA capabilities
2. **Performance:** Virtual scrolling for large lists
3. **Accessibility:** Enhanced screen reader support
4. **Testing:** Comprehensive test coverage
5. **Documentation:** Interactive API documentation

### User Experience

1. **Customization:** User preferences and themes
2. **Notifications:** Real-time updates and alerts
3. **Mobile App:** Native mobile application
4. **Internationalization:** Multi-language support
5. **Onboarding:** Guided user onboarding flow

## Configuration

### Environment Variables

**Required:**
- `VITE_CHAIN_ID`: Blockchain network ID
- `VITE_RPC_URL`: RPC endpoint URL
- `VITE_CONTRACT_ADDRESS`: NFT contract address

**Optional:**
- `VITE_MEMBER_API_URL`: Member service URL
- `VITE_TBA_REGISTRY`: TBA registry contract
- `VITE_RATE_LIMIT_DELAY`: Custom rate limit delay
- `VITE_BATCH_SIZE`: Loading batch size

### Feature Flags

Features can be enabled/disabled through configuration:

```typescript
const FEATURE_FLAGS = {
  memberIntegration: true,
  tbaSupport: true,
  rateLimiting: true,
  progressiveLoading: true,
  transferFunctionality: true
};
```

## Security Considerations

### Data Validation

- All user inputs are validated
- API responses are sanitized
- Address formats are verified
- URL safety is checked

### Rate Limiting Security

- Prevents API abuse
- Implements exponential backoff
- Tracks request patterns
- Automatic protection against overload

### Blockchain Security

- Transaction validation
- Network verification
- Gas estimation
- Error handling for failed transactions

### Privacy Protection

- No sensitive data logging
- Secure API communication
- User consent for external calls
- Data minimization principles

## Performance Metrics

### Key Performance Indicators

1. **Load Time:** Page load under 2 seconds
2. **API Response:** Member API under 500ms
3. **Progressive Loading:** 3 tokens per 500ms
4. **Error Rate:** Less than 1% for API calls
5. **User Engagement:** Session duration and interactions

### Monitoring

- Performance tracking with Web Vitals
- Error monitoring and alerting
- API response time tracking
- User behavior analytics
- Resource usage monitoring

## Conclusion

The NFT Store frontend provides a comprehensive, user-friendly interface for NFT management with advanced features like rate limiting, member information integration, and Token Bound Account support. The modular architecture ensures maintainability and extensibility for future enhancements.