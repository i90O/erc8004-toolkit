// scan.js — Batch scan recent agents for security issues
import { getRecentRegistrations, getAgentProfile } from './registry.js';
import { auditAgent } from './audit.js';

export async function scanRecent(limit = 50, chain = 'base') {
  console.log(`\n🔍 Scanning last ${limit} registered agents on ${chain}...\n`);
  
  const registrations = await getRecentRegistrations(limit, chain);
  const results = {
    scanned: 0,
    healthy: 0,
    warnings: 0,
    critical: 0,
    agents: [],
  };
  
  for (const reg of registrations) {
    try {
      process.stdout.write(`   Auditing agent #${reg.agentId}...`);
      const audit = await auditAgent(reg.agentId, chain);
      
      results.scanned++;
      if (audit.riskLevel === 'LOW') results.healthy++;
      else if (audit.riskLevel === 'MEDIUM') results.warnings++;
      else results.critical++;
      
      results.agents.push({
        agentId: reg.agentId,
        name: audit.name,
        owner: reg.owner,
        score: audit.scores.overall,
        riskLevel: audit.riskLevel,
        findingsCount: audit.findings.length,
        criticalFindings: audit.findings.filter(f => f.severity === 'critical').length,
      });
      
      const icon = { LOW: '🟢', MEDIUM: '🟡', HIGH: '🔴' }[audit.riskLevel];
      process.stdout.write(` ${icon} ${audit.scores.overall}/100\n`);
    } catch (e) {
      process.stdout.write(` ❌ Error: ${e.message}\n`);
    }
  }
  
  return results;
}

export function formatScanResult(r) {
  let out = `\n📋 Scan Report\n`;
  out += `   Scanned: ${r.scanned} agents\n`;
  out += `   🟢 Healthy: ${r.healthy}  🟡 Warnings: ${r.warnings}  🔴 Critical: ${r.critical}\n\n`;
  
  // Sort by risk (critical first)
  const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const sorted = [...r.agents].sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
  
  // Show flagged agents
  const flagged = sorted.filter(a => a.riskLevel !== 'LOW');
  if (flagged.length > 0) {
    out += `   ⚠️ Flagged Agents:\n`;
    for (const a of flagged) {
      const icon = a.riskLevel === 'HIGH' ? '🔴' : '🟡';
      out += `   ${icon} #${a.agentId} "${a.name}" — Score: ${a.score}/100, ${a.criticalFindings} critical issues\n`;
      out += `      Owner: ${a.owner.substring(0, 20)}...\n`;
    }
  } else {
    out += `   ✅ All scanned agents passed security checks.\n`;
  }
  
  // Top 5 by score
  const top = [...r.agents].sort((a, b) => b.score - a.score).slice(0, 5);
  out += `\n   🏆 Top 5 Agents by Score:\n`;
  for (let i = 0; i < top.length; i++) {
    out += `   ${i + 1}. #${top[i].agentId} "${top[i].name}" — ${top[i].score}/100\n`;
  }
  
  return out;
}
