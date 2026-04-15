#!/usr/bin/env node
// Pushes the 5 batch workflow files + api-config.cjs update to donor-map-engine.
// Run once: node scripts/push-engine-workflows.cjs

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = 'Guerillapropaganda/donor-map-engine';

function ghApi(endpoint, method, body) {
  const cmd = `gh api ${endpoint} --method ${method} --input -`;
  return execSync(cmd, {
    input: JSON.stringify(body),
    encoding: 'utf8',
  });
}

function pushFile(repoPath, localPath, message, existingSha = null) {
  const content = Buffer.from(fs.readFileSync(localPath, 'utf8')).toString('base64');
  const body = { message, content };
  if (existingSha) body.sha = existingSha;
  const result = ghApi(`repos/${REPO}/contents/${repoPath}`, 'PUT', body);
  const parsed = JSON.parse(result);
  console.log(`✓ ${repoPath} → ${parsed.commit?.sha?.slice(0,8)}`);
}

function getSha(repoPath) {
  try {
    const result = execSync(`gh api repos/${REPO}/contents/${repoPath} --jq '.sha'`, { encoding: 'utf8' });
    return result.trim();
  } catch {
    return null; // file doesn't exist yet
  }
}

const base = 'C:/Users/third/donor-map-site/.claude/worktrees/youthful-curran';

// 1. New batch workflow files (no existing SHA needed)
const workflows = [
  ['batch1-bulk.yml', `${base}/tmp-engine-workflows/batch1-bulk.yml`],
  ['batch2-fecapi.yml', `${base}/tmp-engine-workflows/batch2-fecapi.yml`],
  ['batch3-congress.yml', `${base}/tmp-engine-workflows/batch3-congress.yml`],
  ['batch4-independent-gov.yml', `${base}/tmp-engine-workflows/batch4-independent-gov.yml`],
  ['batch5-corporate.yml', `${base}/tmp-engine-workflows/batch5-corporate.yml`],
];

for (const [name, localPath] of workflows) {
  const repoPath = `.github/workflows/${name}`;
  const sha = getSha(repoPath);
  pushFile(repoPath, localPath, `Add ${name}: batched pipeline workflow`, sha);
}

// 2. Update api-enrichment.yml — remove schedules, keep as manual trigger only
const apiEnrichmentSha = '878599c398956d4a98dd9c24afceb298d3516543';
const apiEnrichmentLocal = `${base}/tmp-engine-workflows/api-enrichment-manual.yml`;
if (fs.existsSync(apiEnrichmentLocal)) {
  pushFile('.github/workflows/api-enrichment.yml', apiEnrichmentLocal,
    'api-enrichment.yml: remove schedules — now manual trigger only (batches own schedules)', apiEnrichmentSha);
}

// 3. Update api-config.cjs — disable LDA
const apiConfigSha = '15be14a88f1fc5a8ec38320a72a3970c19034ebd';
const apiConfigLocal = `${base}/tmp-engine-workflows/api-config-updated.cjs`;
if (fs.existsSync(apiConfigLocal)) {
  pushFile('scripts/lib/api-config.cjs', apiConfigLocal,
    'Disable LDA: domain mid-migration (lda.senate.gov → lda.gov), remove hardcoded token', apiConfigSha);
}

console.log('\nAll files pushed.');
