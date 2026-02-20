// audit.js — Security audit for AI agent identities
import { getAgentProfile } from './registry.js';
import { CHAINS } from './constants.js';

// Known malicious patterns
const SUSPICIOUS_DOMAINS = [
  'bit.ly', 'tinyurl.com', 'is.gd', 't.co',  // URL shorteners (hide destination)
  'ngrok.io', 'localhost', '127.0.0.1', '0.0.0.0',  // Local/tunnel endpoints
];

const PHISHING_PATTERNS = [
  /metamask.*connect/i, /wallet.*approve/i, /claim.*airdrop/i,
  /free.*token/i, /urgent.*action/i,
];

const KNOWN_BLACKLISTED_ADDRESSES = new Set([
  // Tornado Cash router
  '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b'.toLowerCase(),
  '0x722122dF12D4e14e13Ac3b6895a86e84145b6967'.toLowerCase(),
]);

function checkMetadataSchema(metadata) {
  const issues = [];
  const warnings = [];
  
  if (!metadata) {
    issues.push('No metadata found — agent has no identity information');
    return { issues, warnings, score: 0 };
  }
  
  // Required fields
  if (!metadata.name) issues.push('Missing "name" field');
  if (!metadata.description) warnings.push('Missing "description" field');
  
  // Name sanity
  if (metadata.name && metadata.name.length > 200) {
    warnings.push(`Name is suspiciously long (${metadata.name.length} chars)`);
  }
  
  // Services validation
  if (!metadata.services || !Array.isArray(metadata.services)) {
    warnings.push('No services array — agent cannot be contacted');
  } else {
    for (const s of metadata.services) {
      if (!s.endpoint) {
        issues.push(`Service "${s.name || 'unnamed'}" has no endpoint`);
      }
    }
  }
  
  let score = 100;
  score -= issues.length * 15;
  score -= warnings.length * 5;
  return { issues, warnings, score: Math.max(0, score) };
}

function checkEndpointSecurity(metadata) {
  const issues = [];
  const warnings = [];
  
  if (!metadata?.services) return { issues, warnings, score: 100 };
  
  for (const s of metadata.services) {
    const url = s.endpoint || '';
    const name = s.name || 'unnamed';
    
    // Check for HTTP (not HTTPS)
    if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      issues.push(`[${name}] Uses HTTP instead of HTTPS — traffic can be intercepted`);
    }
    
    // Check for suspicious domains
    for (const domain of SUSPICIOUS_DOMAINS) {
      if (url.includes(domain)) {
        warnings.push(`[${name}] Uses suspicious domain: ${domain}`);
      }
    }
    
    // Check for IP addresses (instead of domains)
    if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
      warnings.push(`[${name}] Uses raw IP address instead of domain`);
    }
  }
  
  let score = 100;
  score -= issues.length * 20;
  score -= warnings.length * 10;
  return { issues, warnings, score: Math.max(0, score) };
}

function checkContentSafety(metadata) {
  const issues = [];
  const warnings = [];
  
  if (!metadata) return { issues, warnings, score: 100 };
  
  const textToCheck = JSON.stringify(metadata).toLowerCase();
  
  for (const pattern of PHISHING_PATTERNS) {
    if (pattern.test(textToCheck)) {
      issues.push(`Phishing pattern detected: ${pattern.source}`);
    }
  }
  
  // Check for embedded scripts or data URIs in unexpected places
  if (textToCheck.includes('<script') || textToCheck.includes('javascript:')) {
    issues.push('Contains embedded JavaScript — potential XSS');
  }
  
  if (textToCheck.includes('data:text/html')) {
    issues.push('Contains data:text/html URI — potential phishing page');
  }
  
  let score = 100;
  score -= issues.length * 25;
  score -= warnings.length * 10;
  return { issues, warnings, score: Math.max(0, score) };
}

function checkOwnerReputation(owner) {
  const issues = [];
  const warnings = [];
  
  if (KNOWN_BLACKLISTED_ADDRESSES.has(owner.toLowerCase())) {
    issues.push(`Owner address is on known blacklist (sanctioned/malicious)`);
  }
  
  let score = 100;
  score -= issues.length * 50;
  return { issues, warnings, score: Math.max(0, score) };
}

export async function auditAgent(agentId, chain = 'base') {
  const profile = await getAgentProfile(agentId, chain);
  
  const schema = checkMetadataSchema(profile.metadata);
  const endpoint = checkEndpointSecurity(profile.metadata);
  const content = checkContentSafety(profile.metadata);
  const reputation = checkOwnerReputation(profile.owner);
  
  const overallScore = Math.round(
    (schema.score * 0.25 + endpoint.score * 0.30 + content.score * 0.30 + reputation.score * 0.15)
  );
  
  const allIssues = [
    ...schema.issues.map(i => ({ category: 'Schema', text: i, severity: 'critical' })),
    ...endpoint.issues.map(i => ({ category: 'Endpoint', text: i, severity: 'critical' })),
    ...content.issues.map(i => ({ category: 'Content', text: i, severity: 'critical' })),
    ...reputation.issues.map(i => ({ category: 'Reputation', text: i, severity: 'critical' })),
    ...schema.warnings.map(i => ({ category: 'Schema', text: i, severity: 'warning' })),
    ...endpoint.warnings.map(i => ({ category: 'Endpoint', text: i, severity: 'warning' })),
    ...content.warnings.map(i => ({ category: 'Content', text: i, severity: 'warning' })),
    ...reputation.warnings.map(i => ({ category: 'Reputation', text: i, severity: 'warning' })),
  ];
  
  let riskLevel = 'LOW';
  if (overallScore < 50) riskLevel = 'HIGH';
  else if (overallScore < 75) riskLevel = 'MEDIUM';
  
  return {
    agentId,
    chain,
    name: profile.metadata?.name || 'Unknown',
    owner: profile.owner,
    scores: {
      schema: schema.score,
      endpoint: endpoint.score,
      content: content.score,
      reputation: reputation.score,
      overall: overallScore,
    },
    riskLevel,
    findings: allIssues,
  };
}

export function formatAuditResult(r) {
  const riskEmoji = { LOW: '🟢', MEDIUM: '🟡', HIGH: '🔴' };
  let out = `\n🔒 Security Audit — Agent #${r.agentId} (${r.chain})\n`;
  out += `   Name: ${r.name}\n`;
  out += `   Owner: ${r.owner}\n`;
  out += `   Risk Level: ${riskEmoji[r.riskLevel]} ${r.riskLevel}\n\n`;
  
  out += `   📊 Scores:\n`;
  out += `   ├─ Schema:     ${r.scores.schema}/100\n`;
  out += `   ├─ Endpoints:  ${r.scores.endpoint}/100\n`;
  out += `   ├─ Content:    ${r.scores.content}/100\n`;
  out += `   ├─ Reputation: ${r.scores.reputation}/100\n`;
  out += `   └─ Overall:    ${r.scores.overall}/100\n`;
  
  if (r.findings.length > 0) {
    out += `\n   🔍 Findings (${r.findings.length}):\n`;
    for (const f of r.findings) {
      const icon = f.severity === 'critical' ? '🚨' : '⚠️';
      out += `   ${icon} [${f.category}] ${f.text}\n`;
    }
  } else {
    out += `\n   ✅ No issues found.\n`;
  }
  
  return out;
}
