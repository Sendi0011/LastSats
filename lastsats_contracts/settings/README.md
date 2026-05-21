# Deployment Settings

This directory contains network configuration files for deploying the LastSats contract.

## Security Notice

⚠️ **NEVER commit real mnemonics to version control!**

The `.toml` files in this directory are ignored by git to prevent accidental credential exposure.

## Setup Instructions

1. Copy the template files:
   ```bash
   cp Testnet.toml.template Testnet.toml
   cp Mainnet.toml.template Mainnet.toml
   ```

2. Replace the placeholder mnemonics with your actual deployment keys

3. Or use environment variables:
   ```bash
   export CLARINET_DEPLOYER_MNEMONIC="your twelve word mnemonic phrase here"
   ```

## File Structure

- `*.toml.template` - Safe templates tracked in git
- `*.toml` - Actual configs with credentials (gitignored)
- `Devnet.toml` - Local development (safe to commit)

## Deployment

```bash
# Deploy to testnet
clarinet deployments apply --testnet

# Deploy to mainnet (be careful!)
clarinet deployments apply --mainnet
```