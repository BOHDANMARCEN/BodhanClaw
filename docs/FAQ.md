# FAQ

Status: Alpha • Last updated: 2026-02-12

- **Is BodhanClaw cloud-free?** Yes by default. Cloud models are opt-in via config.
- **Can it run fully offline?** Yes with a local model (Ollama) and no outbound skills.
- **Where are my secrets stored?** Encrypted in `~/.bodhanclaw/secrets.json`.
- **How safe is `shell.run`?** It always passes through policy + (recommended) confirmation. Keep it disabled in `readonly`.
- **Can I add my own model?** Yes via `models:` block using a generic HTTP adapter or by adding a new adapter in `packages/models`.
- **Does it phone home?** No telemetry. Network calls occur only when you configure outbound models/skills.
- **How do I reset everything?** Delete `~/.bodhanclaw/` (config, profiles, secrets, state). Make a backup first if you want history.
- **Can multiple users share one machine?** Use separate OS users or separate `--config` (planned) to isolate state.
- **What about GPUs?** Ollama or future adapters can leverage local GPU; BodhanClaw doesn’t manage drivers.
