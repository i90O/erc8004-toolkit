# 🔍 ERC-8004 Agent Identity Toolkit

> Query, verify, audit, and monitor AI agent identities on-chain.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![ERC-8004](https://img.shields.io/badge/ERC-8004-blue)](https://eips.ethereum.org/EIPS/eip-8004)

ERC-8004 gives every AI agent a portable, verifiable on-chain identity as an ERC-721 NFT. This toolkit is the Swiss Army knife for exploring, verifying, and securing that registry.

**18,500+ agents registered on Base** · **Multi-chain** · **Security-first**

---

## ⚡ Quick Start

```bash
npx erc8004-toolkit stats        # See registry stats
npx erc8004-toolkit agent 100    # Look up any agent
npx erc8004-toolkit audit 100    # Security audit
```

Or install globally:

```bash
npm install -g erc8004-toolkit
erc8004 stats
```

## 🛠️ Commands

### Registry

```bash
# Registry statistics
erc8004 stats [chain]

# Look up agent by ID
erc8004 agent <id> [chain]

# Find all agents owned by an address
erc8004 owner <address> [chain]

# View recent registrations
erc8004 recent [limit] [chain]
```

### Security

```bash
# Health check — verify agent endpoints are alive
erc8004 verify <id> [chain]

# Security audit — schema, endpoints, content, reputation
erc8004 audit <id> [chain]

# Reputation score — weighted scoring with breakdown
erc8004 score <id> [chain]

# Batch scan — audit multiple agents at once
erc8004 scan [limit] [chain]
```

### Tools

```bash
# Launch web dashboard on port 3004
erc8004 dashboard [chain]
```

## 📸 Example Output

### `erc8004 audit 100`

```
🔒 Security Audit — Agent #100 (base)
   Name: bunnar-limji08 by Olas
   Owner: 0x67722c823010CEb4BED5325fE109196C0f67D053
   Risk Level: 🟢 LOW

   📊 Scores:
   ├─ Schema:     85/100
   ├─ Endpoints:  100/100
   ├─ Content:    100/100
   ├─ Reputation: 100/100
   └─ Overall:    96/100

   ✅ No issues found.
```

### `erc8004 score 100`

```
📊 Reputation Score — Agent #100 (base)
   Name: bunnar-limji08 by Olas
   Tier: 🥇 Gold

   Metadata:  ████████████████░░░░ 80/100
   Health:    ████████████████████ 100/100
   Age:       ████████████████████ 100/100
   Activity:  ██████████████░░░░░░ 72/100
   ─────────────────────────────
   Overall:   █████████████████░░░ 88/100
```

### `erc8004 scan 50`

```
🔍 Scanning last 50 registered agents on base...

📋 Scan Report
   Scanned: 50 agents
   🟢 Healthy: 43  🟡 Warnings: 5  🔴 Critical: 2

   ⚠️ Flagged Agents:
   🔴 #18432 "unnamed" — Score: 25/100, 3 critical issues
   🟡 #18401 "test-bot" — Score: 65/100, 1 critical issue
```

## 🏗️ Architecture

```
erc8004-toolkit/
├── src/
│   ├── cli.js          # CLI entry point & command router
│   ├── registry.js     # On-chain read operations (viem)
│   ├── constants.js    # Contract addresses, ABIs, chain configs
│   ├── verify.js       # Endpoint health checking
│   ├── audit.js        # Security audit engine
│   ├── score.js        # Reputation scoring system
│   ├── scan.js         # Batch scanning
│   └── dashboard.js    # Web dashboard (HTML + Chart.js)
└── package.json
```

## ⛓️ Supported Chains

| Chain | RPC | Chain ID |
|-------|-----|----------|
| Base (default) | Public | 8453 |
| Ethereum | Public | 1 |
| BNB Chain | Public | 56 |

The ERC-8004 Identity Registry is deployed at the same address on all chains via CREATE2:
`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`

## 🔒 Security Model

The audit engine checks four dimensions:

1. **Schema Validation** — Is the metadata well-formed? Required fields present?
2. **Endpoint Security** — HTTPS? No suspicious domains? No URL shorteners?
3. **Content Safety** — Phishing patterns? Embedded scripts? Malicious URIs?
4. **Owner Reputation** — Blacklisted addresses? Sanctioned contracts?

Each dimension scores 0-100, weighted into an overall risk assessment.

## 🤝 Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Ideas for contributions:**
- [ ] IPFS metadata upload for `register` command
- [ ] Prometheus metrics export
- [ ] Webhook alerts for suspicious registrations
- [ ] Historical analytics (time-series data)
- [ ] Multi-sig agent support
- [ ] Integration with Olas protocol

## 🔐 Security

Found a vulnerability? Please report it responsibly. See [SECURITY.md](SECURITY.md).

## 📊 Stats (as of Feb 2026)

- **18,500+** registered agents on Base
- **~295 new registrations** per day
- Major participants: Olas, execution.market, individual builders

## How ERC-8004 Works

ERC-8004 is an Ethereum standard for trustless AI agent identity:
- Each agent gets an ERC-721 NFT as a portable identity
- The NFT points to a JSON metadata file (name, description, services, x402 support)
- Agents can declare service endpoints for A2A, web, API, and MCP protocols
- Combined with x402 (HTTP 402 payments), agents can transact autonomously

## License

MIT — See [LICENSE](LICENSE)

---

Built by [KK](https://github.com/i90O) · Powered by [viem](https://viem.sh)
