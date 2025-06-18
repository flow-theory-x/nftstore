# Developer Guide

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- MetaMask browser extension
- Git

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd frontend
   bun install
   ```

2. **Environment configuration:**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

3. **Start development server:**
   ```bash
   bun run dev
   ```

4. **Run type checking:**
   ```bash
   bun run typecheck
   ```

5. **Run linting:**
   ```bash
   bun run lint
   ```

## Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Spinner.tsx      # Loading indicators
│   │   ├── MemberInfoCard.tsx # Member information display
│   │   ├── NFTCard.tsx      # NFT display component
│   │   └── *.module.css     # Component-specific styles
│   ├── contexts/            # React Context providers
│   │   └── RateLimitContext.tsx # Rate limiting state
│   ├── hooks/               # Custom React hooks
│   │   └── useWallet.ts     # Wallet connection logic
│   ├── pages/               # Route components
│   │   ├── TokensPage.tsx   # All tokens listing
│   │   ├── TokenDetailPage.tsx # Individual token view
│   │   └── MintPage.tsx     # NFT minting interface
│   ├── utils/               # Utility functions and services
│   │   ├── nftContract.ts   # Smart contract interaction
│   │   ├── memberService.ts # External API integration
│   │   ├── rateLimiter.ts   # Rate limiting utilities
│   │   └── tbaService.ts    # Token Bound Account logic
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # Shared interfaces
│   ├── constants/           # Application constants
│   │   └── index.ts         # Contract addresses, URLs
│   └── assets/              # Static assets
│       └── icons/           # SVG icons
├── docs/                    # Documentation
│   ├── API.md              # API documentation
│   └── DEVELOPER_GUIDE.md  # This file
└── public/                  # Public assets
```

## Key Architectural Decisions

### Component Structure

**Atomic Design Principles:**
- **Atoms**: Basic UI elements (buttons, inputs, spinners)
- **Molecules**: Combined atoms (NFTCard, MemberInfoCard)
- **Organisms**: Complex components (TokensPage, Layout)
- **Templates**: Page layouts
- **Pages**: Route components

### State Management

**Context-based Architecture:**
- `RateLimitContext`: Global rate limiting state
- `useWallet`: Wallet connection and blockchain state
- Component-level state for UI interactions

### Styling Strategy

**CSS Modules:**
- Scoped styles prevent conflicts
- Consistent naming conventions
- Responsive design patterns
- Dark mode support (future)

## Feature Implementation Guide

### Adding a New Component

1. **Create component file:**
   ```typescript
   // src/components/MyComponent.tsx
   import React from 'react';
   import styles from './MyComponent.module.css';

   interface MyComponentProps {
     title: string;
     optional?: boolean;
   }

   export const MyComponent: React.FC<MyComponentProps> = ({
     title,
     optional = false
   }) => {
     return (
       <div className={styles.container}>
         <h2 className={styles.title}>{title}</h2>
         {optional && <p>Optional content</p>}
       </div>
     );
   };
   ```

2. **Create styles file:**
   ```css
   /* src/components/MyComponent.module.css */
   .container {
     padding: 1rem;
     border: 1px solid #e9ecef;
     border-radius: 8px;
   }

   .title {
     font-size: 1.5rem;
     font-weight: 600;
     margin-bottom: 0.5rem;
   }

   @media (max-width: 768px) {
     .container {
       padding: 0.5rem;
     }
   }
   ```

3. **Export from index:**
   ```typescript
   // src/components/index.ts
   export { MyComponent } from './MyComponent';
   ```

### Adding a New Service

1. **Create service class:**
   ```typescript
   // src/utils/myService.ts
   export class MyService {
     private baseUrl = 'https://api.example.com';

     async fetchData(id: string): Promise<MyData | null> {
       try {
         const response = await fetch(`${this.baseUrl}/data/${id}`);
         if (!response.ok) {
           throw new Error(`HTTP ${response.status}`);
         }
         return await response.json();
       } catch (error) {
         console.error('Failed to fetch data:', error);
         return null;
       }
     }
   }

   export const myService = new MyService();
   ```

2. **Add type definitions:**
   ```typescript
   // src/types/index.ts
   export interface MyData {
     id: string;
     name: string;
     createdAt: string;
   }
   ```

3. **Integrate with rate limiting:**
   ```typescript
   import { rateLimiter } from './rateLimiter';

   async fetchDataWithRateLimit(id: string): Promise<MyData | null> {
     return rateLimiter.executeWithRetry(
       () => this.fetchData(id),
       3, // maxRetries
       1000 // retryDelay
     );
   }
   ```

### Adding a New Page

1. **Create page component:**
   ```typescript
   // src/pages/MyPage.tsx
   import React, { useState, useEffect } from 'react';
   import { Layout } from '../components/Layout';
   import { Spinner } from '../components/Spinner';
   import styles from './MyPage.module.css';

   export const MyPage: React.FC = () => {
     const [loading, setLoading] = useState(true);
     const [data, setData] = useState(null);

     useEffect(() => {
       const fetchData = async () => {
         try {
           // Fetch data logic
           setLoading(false);
         } catch (error) {
           console.error('Failed to fetch data:', error);
           setLoading(false);
         }
       };

       fetchData();
     }, []);

     if (loading) {
       return (
         <Layout>
           <div className={styles.container}>
             <Spinner size="medium" text="Loading..." />
           </div>
         </Layout>
       );
     }

     return (
       <Layout>
         <div className={styles.container}>
           {/* Page content */}
         </div>
       </Layout>
     );
   };
   ```

2. **Add route:**
   ```typescript
   // src/App.tsx
   import { MyPage } from './pages/MyPage';

   // Add to routes
   <Route path="/my-page" element={<MyPage />} />
   ```

## Best Practices

### Code Quality

**TypeScript Usage:**
- Use strict typing for all interfaces
- Avoid `any` types - use specific types or `unknown`
- Prefer interfaces over types for objects
- Use type assertions carefully

**React Patterns:**
- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for expensive components
- Avoid inline functions in render methods

**Error Handling:**
- Always handle promise rejections
- Provide user-friendly error messages
- Log errors for debugging
- Implement graceful degradation

### Performance Optimization

**Loading Strategies:**
- Use progressive loading for large datasets
- Implement skeleton screens during loading
- Lazy load components and routes
- Optimize image loading with proper sizing

**Memory Management:**
- Clean up event listeners in useEffect
- Cancel ongoing requests on unmount
- Use proper dependency arrays in hooks
- Avoid memory leaks in intervals/timeouts

### Security Considerations

**Input Validation:**
- Validate all user inputs
- Sanitize data before display
- Use proper address validation
- Implement rate limiting for API calls

**Blockchain Security:**
- Validate contract addresses
- Check network compatibility
- Implement proper error handling for transactions
- Use proper gas estimation

## Testing Strategy

### Unit Testing

```typescript
// Example test for a utility function
import { describe, it, expect } from 'vitest';
import { formatAddress } from '../utils/formatAddress';

describe('formatAddress', () => {
  it('should format address correctly', () => {
    const address = '0x742d35Cc6235B80D8b2E96aC0FCE1e6FC5f40652';
    const result = formatAddress(address);
    expect(result).toBe('0x742d...0652');
  });
});
```

### Integration Testing

```typescript
// Example test for a service
import { describe, it, expect, vi } from 'vitest';
import { memberService } from '../utils/memberService';

describe('MemberService', () => {
  it('should fetch member info', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ Nick: 'TestUser' })
    });

    const result = await memberService.getMemberInfo('0x123...');
    expect(result).toEqual({ Nick: 'TestUser' });
  });
});
```

### E2E Testing

```typescript
// Example Playwright test
import { test, expect } from '@playwright/test';

test('should load tokens page', async ({ page }) => {
  await page.goto('/tokens');
  await expect(page.locator('h1')).toContainText('All Tokens');
  await expect(page.locator('[data-testid="nft-card"]')).toBeVisible();
});
```

## Common Patterns

### Loading States

```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCall();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);
```

### Error Boundaries

```typescript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }

    return this.props.children;
  }
}
```

### Context Usage

```typescript
const useRateLimit = () => {
  const context = useContext(RateLimitContext);
  if (!context) {
    throw new Error('useRateLimit must be used within RateLimitProvider');
  }
  return context;
};
```

## Deployment Guide

### Build Process

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Build for production
bun run build

# Preview build
bun run preview
```

### Environment Variables

**Production checklist:**
- [ ] `VITE_CHAIN_ID` - Correct network
- [ ] `VITE_RPC_URL` - Reliable RPC endpoint
- [ ] `VITE_OPENSEA_NETWORK` - Matching OpenSea network
- [ ] Contract addresses updated
- [ ] API endpoints configured

### Performance Monitoring

**Key metrics to monitor:**
- Page load times
- API response times
- Error rates
- User engagement
- Wallet connection success rate

## Troubleshooting

### Common Issues

**Build Errors:**
- Check TypeScript errors: `bun run typecheck`
- Verify all imports are correct
- Ensure environment variables are set

**Runtime Errors:**
- Check browser console for errors
- Verify wallet connection
- Check network compatibility
- Validate contract addresses

**Performance Issues:**
- Monitor network requests
- Check for memory leaks
- Optimize large component re-renders
- Implement proper caching

### Debug Tools

**Browser DevTools:**
- Network tab for API calls
- Console for error messages
- React DevTools for component state
- Performance tab for optimization

**Code Debugging:**
- Use `console.log` strategically
- Implement proper error boundaries
- Add loading states for user feedback
- Use proper TypeScript types

## Contributing

### Pull Request Process

1. **Branch naming:** `feature/description` or `fix/description`
2. **Commit messages:** Follow conventional commits
3. **Testing:** Add tests for new features
4. **Documentation:** Update relevant docs
5. **Review:** Request review from team members

### Code Review Checklist

- [ ] Code follows project conventions
- [ ] Types are properly defined
- [ ] Error handling is implemented
- [ ] Performance considerations addressed
- [ ] Security best practices followed
- [ ] Documentation updated
- [ ] Tests added/updated

## Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [ethers.js Documentation](https://docs.ethers.org/)

### Tools
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [CSS Modules Documentation](https://github.com/css-modules/css-modules)

### Community
- [React Community](https://reactjs.org/community/support.html)
- [TypeScript Community](https://www.typescriptlang.org/community/)
- [Ethereum Development](https://ethereum.org/developers/)