import { createPublicClient, http, parseAbi } from 'viem';
import { base, mainnet } from 'viem/chains';
import { IDENTITY_REGISTRY, IDENTITY_ABI, CHAINS } from './constants.js';

const abi = parseAbi(IDENTITY_ABI);

function getClient(chain = 'base') {
  const config = CHAINS[chain];
  const viemChain = chain === 'base' ? base : mainnet;
  return createPublicClient({
    chain: viemChain,
    transport: http(config.rpc),
  });
}

// Get total registered agents
export async function getTotalAgents(chain = 'base') {
  const client = getClient(chain);
  try {
    const total = await client.readContract({
      address: IDENTITY_REGISTRY,
      abi,
      functionName: 'totalSupply',
    });
    return Number(total);
  } catch (e) {
    // totalSupply might not exist, fallback to event counting
    return null;
  }
}

// Get agent URI (registration metadata)
export async function getAgentURI(agentId, chain = 'base') {
  const client = getClient(chain);
  // Try tokenURI first, then agentURI
  for (const fn of ['tokenURI', 'agentURI']) {
    try {
      const uri = await client.readContract({
        address: IDENTITY_REGISTRY,
        abi,
        functionName: fn,
        args: [BigInt(agentId)],
      });
      return uri;
    } catch {}
  }
  return null;
}

// Get agent owner
export async function getAgentOwner(agentId, chain = 'base') {
  const client = getClient(chain);
  const owner = await client.readContract({
    address: IDENTITY_REGISTRY,
    abi,
    functionName: 'ownerOf',
    args: [BigInt(agentId)],
  });
  return owner;
}

// Get agents owned by address
export async function getAgentsByOwner(address, chain = 'base') {
  const client = getClient(chain);
  const balance = await client.readContract({
    address: IDENTITY_REGISTRY,
    abi,
    functionName: 'balanceOf',
    args: [address],
  });
  
  const agents = [];
  for (let i = 0; i < Number(balance); i++) {
    try {
      const tokenId = await client.readContract({
        address: IDENTITY_REGISTRY,
        abi,
        functionName: 'tokenOfOwnerByIndex',
        args: [address, BigInt(i)],
      });
      agents.push(Number(tokenId));
    } catch {
      break;
    }
  }
  return agents;
}

// Fetch and parse agent registration JSON
export async function getAgentProfile(agentId, chain = 'base') {
  const uri = await getAgentURI(agentId, chain);
  const owner = await getAgentOwner(agentId, chain);
  
  let metadata = null;
  try {
    if (uri.startsWith('data:')) {
      // Data URI
      const base64 = uri.split(',')[1];
      metadata = JSON.parse(Buffer.from(base64, 'base64').toString());
    } else if (uri.startsWith('http')) {
      // HTTP URL
      const res = await fetch(uri, { signal: AbortSignal.timeout(5000) });
      metadata = await res.json();
    } else if (uri.startsWith('ipfs://')) {
      const hash = uri.replace('ipfs://', '');
      const res = await fetch(`https://ipfs.io/ipfs/${hash}`, { signal: AbortSignal.timeout(10000) });
      metadata = await res.json();
    }
  } catch (e) {
    metadata = { error: `Failed to fetch: ${e.message}`, rawURI: uri };
  }
  
  return {
    agentId,
    owner,
    uri,
    nftId: `${CHAINS[chain].id}:${IDENTITY_REGISTRY}:${agentId}`,
    metadata,
    chain,
  };
}

// Scan recent registrations via Transfer events (mint = from 0x0)
export async function getRecentRegistrations(limit = 20, chain = 'base') {
  const client = getClient(chain);
  const blockNumber = await client.getBlockNumber();
  const logs = await client.getLogs({
    address: IDENTITY_REGISTRY,
    event: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'])[0],
    args: { from: '0x0000000000000000000000000000000000000000' },
    fromBlock: blockNumber - 50000n,
    toBlock: blockNumber,
  });
  
  const recent = logs.slice(-limit).map(log => ({
    agentId: Number(log.args.tokenId),
    owner: log.args.to,
    blockNumber: Number(log.blockNumber),
    txHash: log.transactionHash,
  }));
  
  return recent.reverse();
}
