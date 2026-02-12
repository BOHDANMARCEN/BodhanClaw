# Installation

Status: Alpha • Last updated: 2026-02-12

## Platforms
- macOS 13+
- Linux (x86_64, arm64)
- Windows 10/11 (PowerShell / WSL). All docs assume PowerShell on Windows.

## Requirements
- Node.js 20+
- npm or pnpm
- git
- Disk: ~300 MB for deps + SQLite db growth
- Optional: Ollama for local models; GPU recommended for larger models

## Steps
```bash
# Clone
git clone https://github.com/BOHDANMARCEN/bodhanclaw.git
cd bodhanclaw

# Install deps
npm install

# Build TypeScript → dist
npm run build

# Initialize user config
npx claw init
```

## Verifying install
- `node -v` should be 20.x.
- `npx claw --help` shows CLI help.
- `claw chat` starts a session; you should see a prompt.

## Keeping up to date
```bash
git pull
npm install
npm run build
```
If APIs or manifests change, re-run `npx claw init` to merge defaults; your secrets and custom profiles stay intact.

## Uninstall
- Remove `~/.bodhanclaw/` (config, profiles, secrets, logs, DB).
- Remove the repo folder.
