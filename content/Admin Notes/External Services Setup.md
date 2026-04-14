---
title: External Services Setup
type: admin-note
note-type: code
status: open
---

# External Services Setup

Three optional free services that add monitoring without needing code changes. Set them up when you have 15 min. Skip any you don't want.

## 1. UptimeRobot. Is the site down?

**What it does.** Pings thedonormap.org every 5 minutes. Emails / texts you within 5 min if it goes down.

**Why.** GitHub Pages has occasional outages. CloudFlare DNS can go stale. You want to know before a reader tells you.

**Setup (5 min).**
1. Go to https://uptimerobot.com → sign up (free tier, no credit card)
2. Click **Add New Monitor**
3. Monitor Type: `HTTP(s)`
4. Friendly Name: `The Donor Map`
5. URL: `https://thedonormap.org`
6. Monitoring Interval: `5 minutes`
7. Alert Contacts: tick your email
8. Click **Create Monitor**

Done. You'll only hear from UptimeRobot when something breaks.

**Optional upgrade.** Add a second monitor for `https://thedonormap.org/interactive/power-rankings` so you catch partial breakage where the homepage loads but interactive pages don't.

---

## 2. Healthchecks.io. Did the dispatcher stop running?

**What it does.** The Attention Dispatcher is supposed to run every 30 min. If it stops (crash, laptop asleep, bug), you never find out, the Attention Queue just goes stale silently. Healthchecks.io fixes that. The dispatcher pings a unique URL every time it runs. If Healthchecks stops hearing from it, it emails you.

**Why.** Silent automation failures are the worst kind. A dead scheduler looks exactly like a working one from the outside.

**Setup (10 min).**
1. Go to https://healthchecks.io → sign up (free tier, 20 checks)
2. Click **Add Check**
3. Name: `attention-dispatcher`
4. Schedule → **Simple**: every `30` minutes, grace time `10` minutes
5. Copy the check's **Ping URL** (looks like `https://hc-ping.com/abc-123-def-456`)
6. Tell me the URL and I'll wire it into `scripts/attention-dispatcher.cjs` so it pings on every successful run.

After that, if the dispatcher ever stops running for 40 minutes, you get an email.

**Also useful for.** Any cron-style script. Add a second check for the weekly deploy / the monthly pipeline refresh / whatever else matters.

---

## 3. Sentry. JS errors in the Ops app

**What it does.** Captures every uncaught exception in the Ops app (localhost:3333), stack trace, URL, user action, timestamp. Free tier is 5k events/month which is way more than you'll ever hit solo.

**Why.** Right now, if the Ops app crashes silently, you just see a blank screen. Sentry gives you the exact line and reproduction steps.

**Should you set it up?** Only if the Ops app starts feeling flaky. Right now it's stable enough that Sentry is overkill. Revisit if you hit 2-3 mystery crashes in a week.

**Setup (15 min when you want it).**
1. Go to https://sentry.io → sign up → create project → Next.js
2. Copy the DSN
3. Tell me the DSN and I'll wire `@sentry/nextjs` into `ops/` with a sensible config (filter out dev noise, capture only real errors, mask PII).

---

## What I already installed locally (no accounts needed)

- `husky`, git hooks manager
- `.husky/pre-commit`, blocks em dashes, banned AI vocab, defamation-prone words, verified-profile regressions, broken YAML, duplicate bioguide IDs
- `.husky/pre-push`, runs `tsc --noEmit` to catch TypeScript errors before they reach GitHub Actions
- `scripts/attention-dispatcher.cjs`, background scheduler that auto-runs all 5 Attention Queue producers every 30 min to 2 hr
- `scripts/attention-dispatcher.bat`, double-click to start the dispatcher on Windows

**To make the dispatcher run automatically on Windows login:**
1. Press `Win+R`, type `shell:startup`, hit Enter
2. Right-click `scripts/attention-dispatcher.bat` → Create shortcut
3. Drag the shortcut into the startup folder that opened
4. Restart once to confirm it auto-starts

After that, every time you turn the laptop on, the dispatcher starts silently and keeps the Attention Queue fresh without you thinking about it.
