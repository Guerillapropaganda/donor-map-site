# The Donor Map — Quartz Setup Guide

Your Quartz site is pre-configured and ready to go. Here's everything you need to get it live.

## What's Already Done

- Quartz 4 installed and configured
- All 1,448 vault pages building successfully
- Custom dark dashboard theme (Theme 3) applied
- Space Grotesk fonts, purple/green accents, dark background
- Wikilinks, backlinks, graph view, search all working
- Homepage with vault overview created

## Step 1: Install Node.js on Your Computer

Download and install Node.js v22+ from: https://nodejs.org/en

Verify it works by opening a terminal and running:
```
node --version
npm --version
```

## Step 2: Get the Site Folder

The complete Quartz project is in your vault at:
```
donor-map-site/
```

Copy this entire folder to wherever you want to keep it on your computer (like your Documents or Projects folder). Or just keep it alongside your vault.

## Step 3: Install Dependencies

Open a terminal, navigate to the folder, and run:
```
cd donor-map-site
npm install
```

## Step 4: Preview Locally

```
npx quartz build --serve
```

Then open http://localhost:8080 in your browser. You'll see your full Donor Map site with the dark dashboard theme.

## Step 5: Deploy to GitHub Pages (Free Hosting)

### First time setup:

1. Create a GitHub account if you don't have one (github.com)

2. Create a new repository called `donor-map` (or whatever you want)

3. In your terminal:
```
cd donor-map-site
git remote set-url origin https://github.com/YOUR-USERNAME/donor-map.git
git add -A
git commit -m "Initial Donor Map site"
git push -u origin main
```

4. Create the GitHub Actions deploy file:

Create `.github/workflows/deploy.yml` in the repo (this is already included in Quartz).

5. In your GitHub repo settings:
   - Go to Settings → Pages
   - Set Source to "GitHub Actions"

Your site will be live at: `https://YOUR-USERNAME.github.io/donor-map/`

## Daily Workflow

### When you update your vault:

1. Edit notes in Obsidian as normal
2. The `content/` folder in donor-map-site needs your latest vault files

**Option A — Manual copy:**
```
# Copy your vault content to the site
cp -r /path/to/your/vault/* donor-map-site/content/
```

**Option B — Symlink (recommended):**
Instead of copying, create a symbolic link so Quartz always sees your latest vault:
```
# Remove the content folder
rm -rf donor-map-site/content

# Create a symlink to your actual vault
ln -s /path/to/your/obsidian/vault donor-map-site/content
```

Now any changes you make in Obsidian are instantly available to Quartz.

### To publish updates:

```
cd donor-map-site
npx quartz sync
```

This builds the site and pushes to GitHub. GitHub Actions deploys it automatically. Takes about 2 minutes.

## Customizing the Theme

All custom styling is in one file:
```
donor-map-site/quartz/styles/custom.scss
```

Common tweaks:
- **Colors**: Change the hex values (like `#6366f1` for purple, `#22c55e` for green)
- **Fonts**: Change font names in `quartz.config.ts`
- **Layout**: Modify components in `quartz/components/`

After any change, preview with `npx quartz build --serve` before publishing.

## Key Files

| File | What It Does |
|------|-------------|
| `quartz.config.ts` | Site title, colors, fonts, plugins |
| `quartz/styles/custom.scss` | All custom CSS overrides |
| `content/index.md` | Homepage content |
| `content/` | Your vault content (all .md files) |

## Troubleshooting

**Build warnings about LaTeX**: These are harmless — your vault uses em-dashes and dollar signs that the LaTeX parser flags. Everything still builds fine.

**Wikilinks not resolving**: Make sure the linked file exists in the content folder. Quartz uses "shortest path" resolution by default.

**Slow build**: First build takes ~1 minute for 1,448 files. Subsequent builds with `--serve` use hot-reload and are near-instant for content changes.

## Cost

- Quartz: Free (open source)
- GitHub Pages hosting: Free
- Custom domain (optional): ~$12/year for a .com
- Total: $0/month (vs $8/month for Obsidian Publish)
