// verify.js — Check if agent endpoints are alive and responsive
import { getAgentProfile } from './registry.js';

const TIMEOUT_MS = 8000;

async function checkEndpoint(url, protocol = 'http') {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const res = await fetch(url, { 
      method: protocol === 'mcp' ? 'POST' : 'GET',
      signal: controller.signal,
      headers: protocol === 'mcp' ? { 'Content-Type': 'application/json' } : {},
      body: protocol === 'mcp' ? JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }) : undefined,
    });
    clearTimeout(timer);
    
    const latency = Date.now() - start;
    return {
      url,
      protocol,
      status: res.status,
      ok: res.status >= 200 && res.status < 400,
      latency,
      statusText: res.statusText,
    };
  } catch (e) {
    return {
      url,
      protocol,
      status: 0,
      ok: false,
      latency: Date.now() - start,
      error: e.name === 'AbortError' ? 'Timeout' : e.message,
    };
  }
}

function detectProtocol(service) {
  const name = (service.name || '').toLowerCase();
  const endpoint = (service.endpoint || '').toLowerCase();
  if (name.includes('mcp') || endpoint.includes('mcp')) return 'mcp';
  if (name.includes('a2a') || endpoint.includes('a2a')) return 'a2a';
  return 'http';
}

export async function verifyAgent(agentId, chain = 'base') {
  const profile = await getAgentProfile(agentId, chain);
  const results = {
    agentId,
    chain,
    name: profile.metadata?.name || 'Unknown',
    owner: profile.owner,
    endpoints: [],
    overallStatus: 'unknown',
    score: 0,
  };

  if (!profile.metadata?.services?.length) {
    results.overallStatus = 'no-endpoints';
    return results;
  }

  let alive = 0;
  for (const service of profile.metadata.services) {
    if (!service.endpoint) continue;
    const protocol = detectProtocol(service);
    const check = await checkEndpoint(service.endpoint, protocol);
    check.serviceName = service.name || 'unnamed';
    results.endpoints.push(check);
    if (check.ok) alive++;
  }

  const total = results.endpoints.length;
  if (total === 0) {
    results.overallStatus = 'no-endpoints';
  } else if (alive === total) {
    results.overallStatus = 'healthy';
    results.score = 100;
  } else if (alive > 0) {
    results.overallStatus = 'degraded';
    results.score = Math.round((alive / total) * 100);
  } else {
    results.overallStatus = 'offline';
    results.score = 0;
  }

  return results;
}

export function formatVerifyResult(r) {
  const statusEmoji = { healthy: '🟢', degraded: '🟡', offline: '🔴', 'no-endpoints': '⚪' };
  let out = `\n${statusEmoji[r.overallStatus] || '❓'} Agent #${r.agentId} — ${r.name} (${r.chain})\n`;
  out += `   Owner: ${r.owner}\n`;
  out += `   Status: ${r.overallStatus.toUpperCase()} (${r.score}/100)\n`;
  
  if (r.endpoints.length === 0) {
    out += `   No service endpoints declared.\n`;
  } else {
    out += `\n   Endpoints:\n`;
    for (const ep of r.endpoints) {
      const icon = ep.ok ? '✅' : '❌';
      const latency = ep.ok ? `${ep.latency}ms` : (ep.error || `HTTP ${ep.status}`);
      out += `   ${icon} [${ep.protocol}] ${ep.serviceName}: ${latency}\n`;
      out += `      ${ep.url}\n`;
    }
  }
  return out;
}
