# Configuration

Status: Alpha • Last updated: 2026-02-12

Config is YAML and lives at `~/.bodhanclaw/config.yml`. Profiles live in `~/.bodhanclaw/profiles/`.

## Default config (annotated)
```yaml
default_model: openai/gpt-4.1   # model alias
default_profile: dev            # active profile

models:
  openai:
    api_key_secret: OPENAI_API_KEY
    base_url: https://api.openai.com/v1
  local:
    type: ollama
    base_url: http://localhost:11434
    model: llama2

profiles:
  dev:
    allowed_skills:
      - filesystem.*
      - git.*
      - shell.run
    auto_confirm: false

  readonly:
    allowed_skills:
      - filesystem.read
      - git.status
    auto_confirm: true
```

## Model blocks
- `openai`: requires `OPENAI_API_KEY` secret. Supports tool calling & streaming.
- `local`: `type: ollama`, `base_url`, `model` fields. No secret needed, fully local.
- Add more providers by name; skills reference them via `default_model` or per-command overrides (future CLI flag `--model`).

## Profiles
- Pattern matching: `filesystem.*` matches `filesystem.read` and `filesystem.write`.
- `auto_confirm: true` skips confirmation prompts for actions marked as needing confirmation (use only for safe profiles like `readonly`).
- Per-skill overrides (example):
  ```yaml
  profiles:
    dev:
      skill_overrides:
        shell.run:
          require_confirmation: true
          command_allowlist:
            - ls *
            - git *
          dangerous_patterns:
            - rm -rf
            - sudo
  ```

## Secrets
- Stored encrypted in `~/.bodhanclaw/secrets.json`.
- Set: `claw secrets set OPENAI_API_KEY`
- List keys (not values): `claw secrets list`
- Delete: `claw secrets delete OPENAI_API_KEY`

## File paths & allowlists
- Skill manifests declare allowed paths; profiles can narrow them further.
- Use absolute or `~/` paths. Globs supported: `~/projects/**`.
- Denylist wins over allowlist.

## Environment overrides
- Any config value can be overridden by env vars prefixed with `CLAW_` (planned). Until then, edit YAML directly.

## Tips
- Keep a `readonly` profile and use it by default.
- Separate work/home profiles if you mix repos with different sensitivity.
- Back up `~/.bodhanclaw/state/` if you care about history.
