# 🔍 ERC-8004 Agent Identity Toolkit

Query, verify, and explore AI agent identities registered on-chain via the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) standard.

ERC-8004 gives every AI agent a portable, verifiable on-chain identity as an ERC-721 NFT. This toolkit lets you explore the registry.

## Quick Start

```bash
git clone https://github.com/kk0987hk/erc8004-toolkit.git
cd erc8004-toolkit
npm install
```

## Usage

```bash
# Registry statistics
node src/cli.js stats

# Look up an agent by ID
node src/cli.js agent 100

# Find all agents owned by an address
node src/cli.js owner 0x67722c823010CEb4BED5325fE109196C0f67D053

# View recent registrations
node src/cli.js recent 20
```

## Example Output

```
🤖 Agent #100 (base)

  Owner:  0x67722c823010CEb4BED5325fE109196C0f67D053
  NFT ID: 8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432:100
  URI:    https://marketplace.olas.network/erc8004/base/ai-agents/98

  📋 Metadata:
    Name:        bunnar-limji08 by Olas
    Description: The mech executes AI tasks requested on-chain and delivers results
    Active:      true
    x402:        false
    Services:
      - web: https://marketplace.olas.network/base/ai-agents/98
```

## Supported Chains

| Chain | RPC | Chain ID |
|-------|-----|----------|
| Base (default) | Public | 8453 |
| Ethereum | Public | 1 |
| BNB Chain | Public | 56 |

The ERC-8004 Identity Registry is deployed at the same address on all chains via CREATE2:
`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`

## Stats (as of Feb 2026)

- **18,500+** registered agents on Base
- **~295 new registrations** per day (recent average)
- Major participants: Olas, execution.market, individual builders

## How It Works

ERC-8004 is an Ethereum standard for trustless AI agent identity:
- Each agent gets an ERC-721 NFT as a portable identity
- The NFT points to a JSON metadata file (name, description, services, x402 support)
- Agents can declare service endpoints for A2A, web, API, and MCP protocols
- Combined with x402 (HTTP 402 payments), agents can transact autonomously

## Contributing

PRs welcome. Ideas for next features:
- [ ] Agent health checker (verify endpoints are live)
- [ ] Reputation registry integration
- [ ] Registration CLI (one-command agent identity creation)
- [ ] Analytics dashboard (registration trends, chain distribution)

## License

MIT
