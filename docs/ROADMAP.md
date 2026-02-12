# Roadmap

Status: Alpha • Last updated: 2026-02-12

## Phase 1 — Living Daemon (current)
- Minimal CLI (`claw chat`, `claw run`)
- OpenAI adapter
- Basic agent loop (no tools) ✅
- Session history in SQLite ✅

## Phase 2 — Skills + Security (in progress)
- Skill manifests + loader
- Policy engine (profiles, permissions)
- First skills: `filesystem.read`, `shell.run`, `git.status`
- Confirmation flow for dangerous actions
- Tool-call capable models wired to skills

## Phase 3 — Memory + Audit
- Full task history in SQLite (sessions/messages/tool_calls)
- `claw sessions list/show`
- Structured audit logs with export
- Optional vector memory for context search

## Phase 4 — API + UI
- HTTP API on localhost
- Web UI: sessions, approvals, profile editor
- Live log viewer

## Future ideas
- Multi-agent coordination (local swarm)
- Encrypted remote sync (opt-in)
- Skill marketplace with reputation
- Hardware integrations (GPU/TPU/local accelerators)

## Philosophy checkpoint
Stay local-first, explicit permissions, human-in-the-loop, transparent logs.
