---
title: Backup & Recovery Playbook
type: admin-note
note-type: code
priority: normal
status: open
last-updated: '2026-04-15'
---

# Backup and Recovery Playbook

## Current state

| Component | Location | Redundancy |
|-----------|----------|------------|
| Source code + vault | GitHub `donor-map-site` (public, branch: v4) | GitHub's infrastructure |
| Private backup | GitHub `donor-map-vault` (private) | Same provider, separate repo |
| Canonical data stores | `data/*.jsonl` (9 stores, ~44k records) | In git history |
| Ops app data | `ops/data/` (gitignored) | LOCAL ONLY, not backed up |
| Working laptop | David's machine | Single copy for uncommitted work |

**Risk:** The primary and backup repos are both on GitHub. If David's GitHub account is compromised or suspended, both are inaccessible simultaneously.

## Backup architecture

### Primary: GitHub `donor-map-site` (public)
- Every push to v4 triggers GitHub Pages deploy
- Full git history available
- Pre-commit hooks ensure data integrity on every commit

### Secondary: GitHub `donor-map-vault` (private)
- Mirror of donor-map-site, pushed daily via automation
- Preserves the same branch/tag structure
- Set up as a git remote named `backup`

### Recommended: Third remote on a different provider
- Codeberg (EU-based, nonprofit) or a self-hosted Gitea instance
- Adds geographic + provider diversity
- David's call to set up (see "Setting up a third remote" below)

## Daily backup automation

A Windows Task Scheduler job runs `scripts/backup/refresh-vault-backup.bat` at 3:00 AM daily:
1. Pushes current v4 to `backup` remote (donor-map-vault)
2. Creates a dated tag `backup/YYYY-MM-DD`
3. Pushes the tag
4. Logs to `scripts/backup/backup.log`

A staleness alarm (`scripts/security/backup-staleness-check.cjs`) queries the backup repo and writes to the Attention Queue if the last push is >48 hours old.

## Recovery procedures

### Scenario 1: Laptop dies, GitHub intact

**Recovery time: ~30 minutes**

1. Clone the repo:
   ```bash
   git clone https://github.com/Guerillapropaganda/donor-map-site.git
   cd donor-map-site
   git checkout v4
   ```

2. Install dependencies:
   ```bash
   npm install
   cd ops && npm install && cd ..
   ```

3. Verify the vault:
   ```bash
   node -e "const fs=require('fs');const yaml=require('js-yaml');..." # YAML scan (see preflight)
   node --test scripts/phase-6-regression-tests.cjs
   node --test scripts/query-engine-contract-tests.cjs
   node scripts/phase-6-data-integrity-audit.cjs
   ```

4. Build:
   ```bash
   npx quartz build
   ```

5. Restore ops data (if you have a backup of `ops/data/`):
   ```bash
   # Copy ops/data/ from wherever you backed it up
   cd ops && npm run dev  # verify ops app works
   ```

6. Re-link Obsidian vault:
   - Open Obsidian, point vault at `content/` directory
   - Restore `.obsidian/` settings from personal backup if available

### Scenario 2: GitHub account compromised

**Recovery time: ~1 hour**

1. Contact GitHub support immediately: https://support.github.com
2. Clone from backup remote (donor-map-vault) or third remote
3. Create a new GitHub repo under a new/recovered account
4. Push the backup clone to the new repo
5. Update GitHub Pages DNS/CNAME settings
6. Rotate ALL credentials (Clerk, Stripe, any API keys)

### Scenario 3: Partial data corruption (bad merge, broken JSONL)

**Recovery time: ~15 minutes**

1. Identify the last known-good commit:
   ```bash
   git log --oneline -20
   ```

2. Check out the good state of the specific file:
   ```bash
   git checkout <good-commit> -- data/relationships.jsonl
   ```

3. Run integrity checks:
   ```bash
   node scripts/phase-6-data-integrity-audit.cjs
   ```

4. Commit the fix:
   ```bash
   git commit -m "Restore relationships.jsonl from <good-commit>"
   ```

### Scenario 4: Complete repo history rewrite needed (leaked secret in history)

**Recovery time: ~2-4 hours**

1. Install git-filter-repo (NOT git filter-branch):
   ```bash
   pip install git-filter-repo
   ```

2. Purge the secret:
   ```bash
   git-filter-repo --invert-paths --path path/to/file-with-secret
   # Or for inline secrets: use --blob-callback
   ```

3. Force-push to all remotes (this is one of the few legitimate force-push scenarios):
   ```bash
   git push origin v4 --force-with-lease
   git push backup v4 --force-with-lease
   ```

4. Rotate the leaked credential immediately. Assume it is compromised.

## Laptop replacement checklist

When setting up a new development machine:

1. [ ] Clone donor-map-site repo
2. [ ] `npm install` in root and `ops/`
3. [ ] Install Obsidian, point at `content/`
4. [ ] Restore `.obsidian/` config from personal backup
5. [ ] Set up `.env.local` in `ops/` (Clerk keys, Stripe keys)
6. [ ] Install gitleaks (`scoop install gitleaks`)
7. [ ] Install gh CLI and authenticate
8. [ ] Add `backup` remote: `git remote add backup https://github.com/Guerillapropaganda/donor-map-vault.git`
9. [ ] Run full test suite to verify
10. [ ] Install Task Scheduler backup job: `scripts/backup/install-backup-schedule.bat`
11. [ ] Start attention dispatcher: `node scripts/attention-dispatcher.cjs`

## Setting up a third remote (recommended)

To add provider diversity:

1. Create a free account on Codeberg.org (or similar)
2. Create a private repo named `donor-map-site`
3. Add as a remote:
   ```bash
   git remote add codeberg https://codeberg.org/USERNAME/donor-map-site.git
   ```
4. Update the backup script to push to both `backup` and `codeberg`
5. Update the staleness check to monitor both

## What is NOT backed up

- `ops/data/` (local ops app state: security checklist progress, costs, etc.)
  - **Fix:** Periodically copy `ops/data/` to a personal backup location
- `.env.local` files (credentials)
  - **Fix:** Use a password manager (1Password, Bitwarden) to store all service credentials
- Obsidian `.obsidian/` config (plugins, themes, hotkeys)
  - **Fix:** Keep a zip of `.obsidian/` in a personal backup location
