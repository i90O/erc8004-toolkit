// score.js — Agent reputation scoring system
import { getAgentProfile, getRecentRegistrations } from './registry.js';
import { verifyAgent } from './verify.js';
import { IDENTITY_REGISTRY, CHAINS } from './constants.js';
import { createPublicClient, http, parseAbi } from 'viem';
import { base, mainnet } from 'viem/chains';

const viemChains = { base, ethereum: mainnet };

function getClient(chain = 'base') {
  const config = CHAINS[chain];
  return createPublicClient({
    chain: viemChains[chain] || base,
    transport: http(config.rpc),
  });
}

async function getRegistrationAge(agentId, chain = 'base') {
  const client = getClient(chain);
  try {
    // Search for Transfer event (mint) for this token
    const blockNumber = await client.getBlockNumber();
    const logs = await client.getLogs({
      address: IDENTITY_REGISTRY,
      event: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'])[0],
      args: { 
        from: '0x0000000000000000000000000000000000000000',
        tokenId: BigInt(agentId),
      },
      fromBlock: blockNumber - 5000000n, // ~6 months of blocks
      toBlock: blockNumber,
    });
    
    if (logs.length > 0) {
      const block = await client.getBlock({ blockNumber: logs[0].blockNumber });
      const ageDays = (Date.now() / 1000 - Number(block.timestamp)) / 86400;
      return ageDays;
    }
  } catch {}
  return 0;
}

async function getOwnerActivity(owner, chain = 'base') {
  const client = getClient(chain);
  try {
    const txCount = await client.getTransactionCount({ address: owner });
    const balance = await client.getBalance({ address: owner });
    return {
      txCount,
      balanceETH: Number(balance) / 1e18,
    };
  } catch {
    return { txCount: 0, balanceETH: 0 };
  }
}

function scoreMetadataCompleteness(metadata) {
  if (!metadata) return 0;
  let score = 0;
  const maxScore = 100;
  
  if (metadata.name) score += 15;
  if (metadata.description) score += 15;
  if (metadata.description && metadata.description.length > 50) score += 10;
  if (metadata.active !== undefined) score += 10;
  if (metadata.x402Support !== undefined) score += 10;
  if (metadata.services?.length > 0) score += 20;
  if (metadata.services?.length > 1) score += 10;
  if (metadata.image) score += 5;
  if (metadata.version) score += 5;
  
  return Math.min(score, maxScore);
}

export async function scoreAgent(agentId, chain = 'base') {
  console.log(`   Fetching agent profile...`);
  const profile = await getAgentProfile(agentId, chain);
  
  console.log(`   Checking endpoint health...`);
  let healthScore = 0;
  try {
    const verification = await verifyAgent(agentId, chain);
    healthScore = verification.score;
  } catch {
    healthScore = 0;
  }
  
  console.log(`   Checking registration age...`);
  const ageDays = await getRegistrationAge(agentId, chain);
  // Age score: max at 90 days
  const ageScore = Math.min(100, Math.round((ageDays / 90) * 100));
  
  console.log(`   Checking owner activity...`);
  const activity = await getOwnerActivity(profile.owner, chain);
  // Activity score based on tx count
  const activityScore = Math.min(100, Math.round(Math.log10(Math.max(1, activity.txCount)) * 33));
  
  const metadataScore = scoreMetadataCompleteness(profile.metadata);
  
  // Weighted overall
  const overall = Math.round(
    metadataScore * 0.25 +
    healthScore * 0.30 +
    ageScore * 0.20 +
    activityScore * 0.25
  );
  
  let tier = 'Unknown';
  if (overall >= 90) tier = '🏆 Platinum';
  else if (overall >= 75) tier = '🥇 Gold';
  else if (overall >= 50) tier = '🥈 Silver';
  else if (overall >= 25) tier = '🥉 Bronze';
  else tier = '⚪ Unrated';
  
  return {
    agentId,
    chain,
    name: profile.metadata?.name || 'Unknown',
    owner: profile.owner,
    tier,
    scores: {
      metadata: metadataScore,
      health: healthScore,
      age: ageScore,
      activity: activityScore,
      overall,
    },
    details: {
      ageDays: Math.round(ageDays * 10) / 10,
      ownerTxCount: activity.txCount,
      ownerBalance: Math.round(activity.balanceETH * 10000) / 10000,
      servicesCount: profile.metadata?.services?.length || 0,
    },
  };
}

export function formatScoreResult(r) {
  let out = `\n📊 Reputation Score — Agent #${r.agentId} (${r.chain})\n`;
  out += `   Name: ${r.name}\n`;
  out += `   Owner: ${r.owner}\n`;
  out += `   Tier: ${r.tier}\n\n`;
  
  const bar = (score) => {
    const filled = Math.round(score / 5);
    return '█'.repeat(filled) + '░'.repeat(20 - filled) + ` ${score}/100`;
  };
  
  out += `   Metadata:  ${bar(r.scores.metadata)}\n`;
  out += `   Health:    ${bar(r.scores.health)}\n`;
  out += `   Age:       ${bar(r.scores.age)}\n`;
  out += `   Activity:  ${bar(r.scores.activity)}\n`;
  out += `   ─────────────────────────────\n`;
  out += `   Overall:   ${bar(r.scores.overall)}\n\n`;
  
  out += `   📋 Details:\n`;
  out += `   ├─ Registered: ${r.details.ageDays} days ago\n`;
  out += `   ├─ Owner txns: ${r.details.ownerTxCount}\n`;
  out += `   ├─ Owner balance: ${r.details.ownerBalance} ETH\n`;
  out += `   └─ Services: ${r.details.servicesCount} endpoint(s)\n`;
  
  return out;
}
