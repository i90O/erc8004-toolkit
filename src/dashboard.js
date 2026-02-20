// dashboard.js — Local web dashboard for ERC-8004 registry analytics
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getTotalAgents, getRecentRegistrations, getAgentProfile } from './registry.js';
import { CHAINS } from './constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3004;

async function getApiData(chain = 'base') {
  const total = await getTotalAgents(chain);
  const recent = await getRecentRegistrations(50, chain);
  
  // Get sample agent profiles for display
  const sampleAgents = [];
  for (const reg of recent.slice(0, 10)) {
    try {
      const profile = await getAgentProfile(reg.agentId, chain);
      sampleAgents.push({
        id: reg.agentId,
        name: profile.metadata?.name || 'Unknown',
        owner: reg.owner,
        active: profile.metadata?.active ?? null,
        services: profile.metadata?.services?.length || 0,
        block: reg.blockNumber,
      });
    } catch {}
  }
  
  return {
    chain,
    totalAgents: total,
    recentRegistrations: recent.length,
    recentBlocks: recent.map(r => r.blockNumber),
    sampleAgents,
    timestamp: new Date().toISOString(),
    chains: Object.keys(CHAINS),
  };
}

function createHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ERC-8004 Agent Registry Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #e0e0e0; }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 2rem; text-align: center; border-bottom: 2px solid #0f3460; }
  .header h1 { font-size: 2rem; color: #e94560; }
  .header p { color: #888; margin-top: 0.5rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; padding: 2rem; max-width: 1400px; margin: 0 auto; }
  .card { background: #1a1a2e; border-radius: 12px; padding: 1.5rem; border: 1px solid #333; }
  .card h3 { color: #e94560; margin-bottom: 1rem; font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; }
  .stat { font-size: 3rem; font-weight: bold; color: #fff; }
  .stat-label { color: #888; font-size: 0.9rem; }
  .agent-list { list-style: none; }
  .agent-list li { padding: 0.7rem 0; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; }
  .agent-name { color: #4db8ff; font-weight: 500; }
  .agent-id { color: #888; font-size: 0.85rem; }
  .badge { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
  .badge-active { background: #1a472a; color: #4ade80; }
  .badge-inactive { background: #472a1a; color: #f87171; }
  .chart-container { position: relative; height: 250px; }
  .loading { text-align: center; padding: 4rem; color: #888; font-size: 1.2rem; }
  #refresh { background: #e94560; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-top: 1rem; }
  #refresh:hover { background: #c73e54; }
  .footer { text-align: center; padding: 2rem; color: #555; font-size: 0.8rem; }
</style>
</head>
<body>
<div class="header">
  <h1>🔍 ERC-8004 Agent Registry</h1>
  <p>Real-time analytics for on-chain AI agent identities</p>
  <button id="refresh" onclick="loadData()">⟳ Refresh</button>
</div>
<div id="content" class="loading">Loading registry data...</div>
<div class="footer">ERC-8004 Toolkit by KK | Data from Base, Ethereum, BNB Chain</div>

<script>
async function loadData() {
  document.getElementById('content').innerHTML = '<div class="loading">Loading...</div>';
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    render(data);
  } catch(e) {
    document.getElementById('content').innerHTML = '<div class="loading">Error: ' + e.message + '</div>';
  }
}

function render(data) {
  const html = \`
  <div class="grid">
    <div class="card">
      <h3>📊 Total Agents</h3>
      <div class="stat">\${(data.totalAgents || 0).toLocaleString()}</div>
      <div class="stat-label">Registered on \${data.chain}</div>
    </div>
    <div class="card">
      <h3>📈 Recent Activity</h3>
      <div class="stat">\${data.recentRegistrations}</div>
      <div class="stat-label">New registrations (last ~50k blocks)</div>
    </div>
    <div class="card">
      <h3>⛓️ Supported Chains</h3>
      <div class="stat">\${data.chains.length}</div>
      <div class="stat-label">\${data.chains.join(', ')}</div>
    </div>
    <div class="card" style="grid-column: span 2;">
      <h3>🤖 Recent Agents</h3>
      <ul class="agent-list">
        \${data.sampleAgents.map(a => \`
          <li>
            <div>
              <span class="agent-name">\${a.name}</span>
              <span class="agent-id"> #\${a.id}</span>
            </div>
            <div>
              <span class="badge \${a.active ? 'badge-active' : 'badge-inactive'}">\${a.active ? 'Active' : 'Unknown'}</span>
              <span class="agent-id"> \${a.services} svc</span>
            </div>
          </li>
        \`).join('')}
      </ul>
    </div>
    <div class="card">
      <h3>🕐 Last Updated</h3>
      <div style="color:#4db8ff; font-size:1.1rem;">\${new Date(data.timestamp).toLocaleString()}</div>
      <div class="stat-label" style="margin-top:1rem;">Registry: 0x8004...a432</div>
    </div>
  </div>\`;
  document.getElementById('content').innerHTML = html;
}

loadData();
</script>
</body>
</html>`;
}

export async function startDashboard(chain = 'base') {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/api/data') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      try {
        const data = await getApiData(chain);
        res.end(JSON.stringify(data));
      } catch (e) {
        res.end(JSON.stringify({ error: e.message }));
      }
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(createHTML());
    }
  });
  
  server.listen(PORT, () => {
    console.log(`\n🌐 ERC-8004 Dashboard running at http://localhost:${PORT}\n`);
    console.log(`   Chain: ${chain}`);
    console.log(`   Press Ctrl+C to stop.\n`);
  });
}
