# LastSats Frontend

The LastSats frontend is a Next.js application that provides a user interface for managing Bitcoin inheritance vaults on Stacks.

## Mock Mode (Default)

The application runs in **mock mode** by default, allowing users to test all functionality without a deployed smart contract. This is perfect for:

- Testing the complete user experience
- Development and debugging  
- Demonstrating the application to users

### Visual Indicators
When in mock mode, users will see:
- Orange demo banner at the top of the application
- "DEMO" badge next to wallet balances
- Mock sBTC and STX balances based on wallet address

### Mock Data Behavior
- **sBTC Balance**: 0-0.99 sBTC (deterministic based on wallet address)
- **STX Balance**: 50-149.9 STX (deterministic based on wallet address)
- **Vault Operations**: Full functionality using predefined mock data
- **Heartbeats**: Simulated transaction delays and state updates

## Production Setup

To connect to a real deployed contract:

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Configure your environment variables:
   ```bash
   # Set network (testnet or mainnet)
   NEXT_PUBLIC_STACKS_NETWORK=testnet
   
   # Set your deployed contract address
   NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS=ST1234...ABCD.lastsats-vault
   ```

3. Restart the development server

## Waitlist & admin dashboard

Landing-page signups are stored in a Supabase (Postgres) table and can be viewed
or exported from a password-protected `/admin` page.

### One-time setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) to create
   the `waitlist` table (RLS enabled, no public policies).
3. Add these environment variables — locally in `.env.local`, and in your Vercel
   project settings for production:

   ```bash
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # Project Settings → API
   ADMIN_PASSWORD=<a strong password>
   ADMIN_SESSION_SECRET=<run: openssl rand -base64 48>
   ```

   These are server-only. Do **not** prefix them with `NEXT_PUBLIC_`.

### Viewing signups

- Visit `/admin`, enter `ADMIN_PASSWORD`.
- The page lists every signup; search by email and use **Export CSV** to
  download them.

### Notifying users at launch

The list lives in the `waitlist` table. When mainnet ships, either:

- **Export the CSV** from `/admin` and import it into an email tool
  (Resend Audiences, Buttondown, Loops, Mailchimp…), then send the announcement, or
- **Send directly from Supabase** (e.g. an Edge Function + Resend) by reading
  the table.

The `POST /api/waitlist` endpoint validates the address, filters bots with a
honeypot, rate-limits per IP, and dedupes case-insensitively.

## Deployment

### Vercel (Recommended)

The application is configured to deploy seamlessly on Vercel:

1. **Connect your GitHub repository to Vercel**
2. **The build will automatically use webpack instead of Turbopack** (configured via `vercel.json`)
3. **Mock mode is enabled by default** - no environment variables needed

For production with real contract:
- Add `NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS` environment variable in Vercel dashboard
- Set `NEXT_PUBLIC_STACKS_NETWORK` to `mainnet` or `testnet`

### Manual Deployment

Use the included deployment script:

```bash
# Make script executable and run
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Build Configuration

The project uses **webpack** for production builds to ensure compatibility:
- Development: Uses Turbopack for faster dev builds
- Production: Uses webpack to avoid module resolution issues
- Vercel: Automatically configured via `vercel.json`

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Features

- **Wallet Integration**: Connect with Xverse or Leather wallets
- **Vault Management**: Create and manage Bitcoin inheritance vaults
- **Heartbeat System**: Keep vaults active with periodic heartbeats
- **Beneficiary Management**: Set up multiple beneficiaries with time locks
- **Mock Mode**: Full functionality testing without blockchain deployment

## Architecture

- **Framework**: Next.js 16 with React 19
- **Blockchain**: Stacks integration via @stacks/connect
- **Styling**: Custom CSS with design tokens
- **State Management**: React Context for wallet and vault state
