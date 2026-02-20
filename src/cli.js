#!/usr/bin/env node

import { getTotalAgents, getAgentProfile, getAgentsByOwner, getRecentRegistrations } from './registry.js';

const [,, command, ...args] = process.argv;

async function main() {
  switch (command) {
    case 'stats': {
      const chain = args[0] || 'base';
      console.log(`\n📊 ERC-8004 Registry Stats (${chain})\n`);
      const total = await getTotalAgents(chain);
      if (total !== null) {
        console.log(`  Total registered agents: ${total}`);
      } else {
        console.log('  totalSupply not available, scanning events...');
        const regs = await getRecentRegistrations(1000, chain);
        console.log(`  Registered agents (from events): ${regs.length}+`);
      }
      break;
    }

    case 'agent': {
      const agentId = args[0];
      const chain = args[1] || 'base';
      if (!agentId) {
        console.log('Usage: erc8004 agent <agentId> [chain]');
        break;
      }
      console.log(`\n🤖 Agent #${agentId} (${chain})\n`);
      try {
        const profile = await getAgentProfile(Number(agentId), chain);
        console.log(`  Owner:  ${profile.owner}`);
        console.log(`  NFT ID: ${profile.nftId}`);
        console.log(`  URI:    ${profile.uri.substring(0, 100)}${profile.uri.length > 100 ? '...' : ''}`);
        if (profile.metadata) {
          console.log(`\n  📋 Metadata:`);
          console.log(`    Name:        ${profile.metadata.name || 'N/A'}`);
          console.log(`    Description: ${(profile.metadata.description || 'N/A').substring(0, 100)}`);
          console.log(`    Active:      ${profile.metadata.active ?? 'N/A'}`);
          console.log(`    x402:        ${profile.metadata.x402Support ?? 'N/A'}`);
          if (profile.metadata.services?.length) {
            console.log(`    Services:`);
            for (const s of profile.metadata.services) {
              console.log(`      - ${s.name}: ${s.endpoint}`);
            }
          }
        }
      } catch (e) {
        console.log(`  Error: ${e.message}`);
      }
      break;
    }

    case 'owner': {
      const address = args[0];
      const chain = args[1] || 'base';
      if (!address) {
        console.log('Usage: erc8004 owner <address> [chain]');
        break;
      }
      console.log(`\n👤 Agents owned by ${address} (${chain})\n`);
      try {
        const agents = await getAgentsByOwner(address, chain);
        if (agents.length === 0) {
          console.log('  No agents found.');
        } else {
          console.log(`  Found ${agents.length} agent(s): ${agents.join(', ')}`);
          for (const id of agents.slice(0, 5)) {
            const profile = await getAgentProfile(id, chain);
            console.log(`\n  Agent #${id}: ${profile.metadata?.name || 'Unknown'}`);
          }
        }
      } catch (e) {
        console.log(`  Error: ${e.message}`);
      }
      break;
    }

    case 'recent': {
      const limit = Number(args[0]) || 10;
      const chain = args[1] || 'base';
      console.log(`\n📜 Recent ${limit} registrations (${chain})\n`);
      try {
        const regs = await getRecentRegistrations(limit, chain);
        for (const r of regs) {
          console.log(`  #${r.agentId} → ${r.owner.substring(0, 10)}... (block ${r.blockNumber})`);
        }
        console.log(`\n  Total shown: ${regs.length}`);
      } catch (e) {
        console.log(`  Error: ${e.message}`);
      }
      break;
    }

    default:
      console.log(`
🔍 ERC-8004 Agent Identity Toolkit

Commands:
  stats [chain]              Registry statistics
  agent <id> [chain]         Look up agent by ID
  owner <address> [chain]    Find agents by owner address
  recent [limit] [chain]     Recent registrations

Chains: base (default), ethereum, bnb

Examples:
  node src/cli.js stats
  node src/cli.js agent 1
  node src/cli.js owner 0x1234...
  node src/cli.js recent 20
      `);
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
