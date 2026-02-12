# Getting Started with BodhanClaw

Status: Alpha • Last updated: 2026-02-12

## TL;DR (5 minutes)
1. Install Node.js 20+ and git.
2. `git clone https://github.com/BOHDANMARCEN/bodhanclaw.git && cd bodhanclaw`
3. `npm install && npm run build`
4. `npx claw init` — creates `~/.bodhanclaw/config.yml` and profiles.
5. `claw chat` — start an interactive session.
6. `claw run "List all TypeScript files"` — one-shot task.

Everything runs locally; nothing leaves your machine unless you configure a remote model.

## Prerequisites
- Node.js 20 or newer (check with `node -v`).
- npm (bundled with Node) or pnpm/yarn.
- Git.
- Optional: [Ollama](https://ollama.ai) for local models.
- Optional: OpenAI/Anthropic API key if you want cloud models.

## First launch
```bash
npm install
npm run build
npx claw init
```
`claw init` creates the config + default profiles. You can safely re-run it; it won’t overwrite custom settings without asking.

## Basic flows
- Interactive: `claw chat`
- One-shot: `claw run "convert README to bullet list"`
- Switch profile: `claw --profile readonly chat`
- List skills: `claw tools list`
- Tail logs: `claw logs tail`

## Using local models (no cloud)
1. Install Ollama and pull a model: `ollama pull llama2` (example).
2. Edit `~/.bodhanclaw/config.yml`:
   ```yaml
   default_model: local/llama2
   models:
     local:
       type: ollama
       base_url: http://localhost:11434
       model: llama2
   ```
3. Run `claw chat`. All traffic stays on-device.

## Switching to OpenAI/Anthropic
- Set a secret: `claw secrets set OPENAI_API_KEY`
- Update config: `default_model: openai/gpt-4.1`
- Confirm your profile allows outbound calls (see `SECURITY_MODEL.md`).

## Where things live
- Config: `~/.bodhanclaw/config.yml`
- Profiles: `~/.bodhanclaw/profiles/*.yml`
- Secrets store: `~/.bodhanclaw/secrets.json` (encrypted)
- DB + logs: `~/.bodhanclaw/state/` (SQLite, audit log)

## Next steps
- Read `CONFIGURATION.md` to tweak profiles.
- Read `SECURITY_MODEL.md` before enabling shell or write permissions.
- Build your own tool: `SKILL_AUTHORING.md`.
