# LastSats Mock Mode Implementation

## What Changed

The LastSats frontend has been updated to run in **mock mode** by default, allowing users to test the application without a deployed smart contract.

## Key Changes

### 1. Smart Contract Environment Handling
- **File**: `src/lib/stacks.ts`
- **Changes**:
  - Added `IS_MOCK_MODE` flag that activates when `NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS` is not set
  - Modified `validateContractAddress()` to return a mock contract address instead of throwing an error
  - Updated `fetchSbtcBalance()` and `fetchStxBalance()` to return consistent mock data based on wallet address

### 2. Wallet Context Updates
- **File**: `src/lib/wallet-context.tsx`
- **Changes**:
  - Added `isMockMode` property to wallet state
  - Wallet context now indicates when mock data is being used

### 3. Visual Mock Mode Indicators
- **File**: `src/components/ui/DemoBanner.tsx` (new)
- **File**: `src/components/ui/Navbar.tsx`
- **File**: `src/app/layout.tsx`
- **Changes**:
  - Added orange demo banner at the top when in mock mode
  - Added "DEMO" indicator next to sBTC balance in navbar
  - Adjusted page padding to accommodate demo banner

### 4. Layout Adjustments
- **Files**: `src/components/landing/Hero.tsx`, `src/components/dashboard/index.tsx`
- **Changes**:
  - Dynamic padding that adjusts for demo banner height (40px extra when in mock mode)

## How It Works

### Mock Mode Activation
Mock mode activates automatically when:
- No `NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS` environment variable is set
- The environment variable is empty or undefined

### Mock Data Behavior
When in mock mode:
- **sBTC Balance**: Generated based on wallet address hash (0-0.99 sBTC)
- **STX Balance**: Generated based on wallet address hash (50-149.9 STX)  
- **Contract Calls**: Skip actual blockchain calls, return mock responses
- **Vault Data**: Uses predefined mock vault data from `src/lib/vault.ts`

### Visual Indicators
Users will see:
1. **Demo Banner**: Orange banner below navbar stating "DEMO MODE: Using mock data"
2. **Navbar Badge**: "DEMO" text next to sBTC balance
3. **Consistent Layout**: Pages automatically adjust padding for banner

## Environment Configuration

### Current State (Mock Mode)
```bash
# No environment variables needed - mock mode is default
```

### To Connect to Real Contract (Future)
```bash
# Create .env.local file with:
NEXT_PUBLIC_STACKS_NETWORK=testnet  # or mainnet
NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS=ST1234...ABCD.lastsats-vault
```

See `.env.example` for full configuration template.

## Benefits

1. **No Environment Setup**: App runs immediately without configuration
2. **User Testing**: Users can explore full functionality without blockchain setup
3. **Development Friendly**: Developers can work without contract deployment
4. **Clear Visual Feedback**: Users know they're using mock data
5. **Easy Migration**: Simple environment variable changes to switch to real contract

## Files Modified

- `src/lib/stacks.ts` - Core mock mode logic
- `src/lib/wallet-context.tsx` - Mock mode state
- `src/components/ui/DemoBanner.tsx` - New demo banner component
- `src/components/ui/Navbar.tsx` - Demo indicator
- `src/components/ui/index.ts` - Export demo banner
- `src/app/layout.tsx` - Include demo banner
- `src/components/landing/Hero.tsx` - Adjusted padding
- `src/components/dashboard/index.tsx` - Adjusted padding
- `.env.example` - Environment configuration template

## Testing

To verify mock mode is working:
1. Start the development server: `npm run dev`
2. Look for the orange demo banner at the top
3. Connect a wallet and see mock balances appear
4. Create vaults and see mock data in dashboard

The app should work fully in demonstration mode without any real blockchain interactions.