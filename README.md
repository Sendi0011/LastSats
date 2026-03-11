# LastSats — Bitcoin Inheritance Protocol

> *"You spent years stacking sats. Don't let them disappear with you."*

LastSats is the first trustless Bitcoin inheritance protocol built on the Stacks blockchain. It uses Clarity smart contracts and a dead man's switch mechanism to automatically distribute sBTC to designated beneficiaries — with no lawyers, no custodians, and no single point of failure.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Wallet Support](#wallet-support)
- [Smart Contract](#smart-contract)
- [Deploying the Contract](#deploying-the-contract)
- [API Reference](#api-reference)
- [Tier System](#tier-system)
- [Security](#security)
- [License](#license)

---

## Overview

### How It Works

1. **Connect** your Xverse or Leather wallet
2. **Deposit** sBTC into a LastSats vault (Clarity smart contract)
3. **Designate** beneficiaries with percentage splits and optional time-locks
4. **Set a heartbeat interval** — sign a lightweight transaction every 30–180 days to prove you are alive
5. **If you miss your heartbeat**, a 30-day grace period begins. Your guardian (if set) can pause execution
6. **After the grace period expires**, the contract automatically distributes sBTC — no human intervention required

### Vault State Machine

```
ACTIVE ──── heartbeat missed ───► GRACE ──── 30 days pass ───► EXECUTING ──► COMPLETE
  ▲               │                  │
  │               │             guardian pause
  └── heartbeat ──┘                  │
                                  PAUSED ──── 30 days pass ───► GRACE
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Fonts | Syne (display), DM Sans (body), DM Mono (code) |
| Wallet | @stacks/connect — Xverse + Leather |
| On-chain reads | Hiro API (api.mainnet.hiro.so) |
| Smart Contract | Clarity (Stacks blockchain) |
| Contract calls | @stacks/transactions, @stacks/network |

---

## Project Structure

```
lastsats/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with WalletProvider
│   │   ├── page.tsx                # Landing page route
│   │   ├── globals.css             # Design tokens + global styles
│   │   └── dashboard/
│   │       └── page.tsx            # Dashboard route
│   ├── components/
│   │   ├── Navbar.tsx              # Fixed nav with wallet state
│   │   ├── WalletModal.tsx         # Xverse + Leather connect modal
│   │   ├── LandingPage.tsx         # Hero, features, pricing, waitlist
│   │   ├── Dashboard.tsx           # Vault list, stats, heartbeat
│   │   ├── CreateVaultModal.tsx    # 4-step vault creation wizard
│   │   └── VaultDetail.tsx         # Slide-in vault detail panel
│   └── lib/
│       ├── wallet-context.tsx      # WalletProvider + useWallet hook
│       ├── stacks-api.ts           # Hiro API + wallet detection
│       └── vault.ts                # Vault types + helpers
├── contracts/
│   └── lastsats-vault.clar         # Clarity smart contract
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- [Clarinet](https://github.com/hirosystems/clarinet) for contract work
- Xverse or Leather browser extension for wallet testing

### Install and Run

```bash
git clone https://github.com/your-username/lastsats
cd lastsats
npm install
npm run dev
```

Open http://localhost:3000

### Build for Production

```bash
npm run build
npm start
```

---

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Stacks network
NEXT_PUBLIC_STACKS_NETWORK=mainnet

# Your deployed contract address (update after deploying)
NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS=SP...YOUR_ADDRESS

# Hiro API key — optional but increases rate limits
# Get one free at: https://platform.hiro.so
NEXT_PUBLIC_HIRO_API_KEY=your_key_here
```

---

## Wallet Support

### Xverse
- Install: https://www.xverse.app
- Supports: STX, sBTC, native BTC
- Detected via: `window.XverseProviders`

### Leather (formerly Hiro Wallet)
- Install: https://leather.io
- Supports: STX, sBTC
- Detected via: `window.StacksProvider` or `window.LeatherProvider`

Both wallets are auto-detected. The connect modal shows an install prompt if neither is found.

---

## Smart Contract

The Clarity contract lives at `contracts/lastsats-vault.clar`.

### Public Functions

| Function | Args | Description |
|---|---|---|
| `create-vault` | interval, amount, tier, guardian? | Deploy a new vault |
| `add-beneficiary` | vault-id, address, percentage, time-lock | Add a beneficiary |
| `send-heartbeat` | vault-id | Prove you are alive, reset countdown |
| `pause-execution` | vault-id | Guardian pauses execution in grace period |
| `trigger-distribution` | vault-id | Execute distribution after grace period expires |
| `withdraw-vault` | vault-id | Owner closes and withdraws from active vault |

### Read-Only Functions

| Function | Returns |
|---|---|
| `get-vault` | Full vault data |
| `get-vault-status` | Live computed status (0–5) |
| `get-beneficiary` | Single beneficiary record |
| `get-beneficiary-count` | Number of beneficiaries on a vault |
| `get-blocks-until-deadline` | Remaining blocks until heartbeat deadline |
| `get-protocol-stats` | Total vaults + total sBTC protected |

---

## Deploying the Contract

See the **Contract Deployment Guide** (included) for the full step-by-step walkthrough with Clarinet. Summary:

```bash
# Install Clarinet
brew install clarinet

# Initialise project
clarinet new lastsats-protocol
cp contracts/lastsats-vault.clar lastsats-protocol/contracts/

# Check and test
cd lastsats-protocol
clarinet check
clarinet test

# Deploy to testnet first
clarinet deployments apply --devnet

# Deploy to mainnet when ready
clarinet deployments apply --mainnet
```

After deploying, update `NEXT_PUBLIC_LASTSATS_CONTRACT_ADDRESS` in `.env.local` and `LASTSATS_CONTRACT_ADDRESS` in `src/lib/stacks-api.ts`.

---

## API Reference

### `fetchStacksBalances(address, network)`

Fetches STX and sBTC balances from the Hiro API.

```typescript
import { fetchStacksBalances } from '@/lib/stacks-api';
const balances = await fetchStacksBalances('SP...', 'mainnet');
// { stxBalance: 1234.5, sbtcBalance: 0.00421 }
```

### `useWallet()` hook

```typescript
const {
  connected,          // boolean
  address,            // string | null
  btcAddress,         // string | null
  walletType,         // 'xverse' | 'leather' | null
  balances,           // { stxBalance, sbtcBalance, btcBalance }
  btcPrice,           // number
  isLoadingBalances,  // boolean
  connect,            // (type) => Promise<void>
  disconnect,         // () => void
  refreshBalances,    // () => Promise<void>
} = useWallet();
```

---

## Tier System

| Tier | Max sBTC | Beneficiaries | Heartbeat | Guardian | Time-locks | Price |
|---|---|---|---|---|---|---|
| Free | 0.05 sBTC | 1 | 180d only | No | No | $0 |
| Hodler | 2 sBTC | 5 | 30/60/90/180d | Yes | Yes | $9/mo |
| Whale | Unlimited | Unlimited | Custom | Yes + Multi-sig | Yes | $49/mo |

---

## Security

- **Non-custodial** — LastSats never holds keys or funds
- **Open source** — all contract code is public and auditable
- **Block-height timing** — deadlines use Bitcoin block height, not wall-clock time
- **Grace period** — 30-day buffer prevents execution from accidental missed heartbeats
- **Guardian role** — trusted contact can pause execution if needed

> This contract has not yet undergone a formal third-party security audit. Do not use with significant funds until a Tier-1 audit has been completed and published. See the Contract Guide for pre-production checklist.

To report a security vulnerability, open a private GitHub security advisory.

---

## License

MIT — see LICENSE for details.

*Built on Stacks · Secured by Bitcoin*
