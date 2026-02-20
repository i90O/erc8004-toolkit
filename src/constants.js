// ERC-8004 Contract Addresses (CREATE2 - same on all EVM chains)
export const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
export const REPUTATION_REGISTRY = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';

export const CHAINS = {
  base: { id: 8453, rpc: 'https://base-mainnet.public.blastapi.io', name: 'Base' },
  ethereum: { id: 1, rpc: 'https://eth.llamarpc.com', name: 'Ethereum' },
  bnb: { id: 56, rpc: 'https://bsc-dataseed.binance.org', name: 'BNB Chain' },
};

export const IDENTITY_ABI = [
  'function register(string agentURI) returns (uint256)',
  'function setAgentURI(uint256 agentId, string agentURI)',
  'function setAgentWallet(uint256 agentId, address wallet, bytes signature)',
  'function agentURI(uint256 agentId) view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];
