# CLI Reference

Status: Alpha • Last updated: 2026-02-12

Syntax: `claw <command> [options]`

## Commands
- `chat` — start interactive session.
  - `--profile <name>`: override profile for this run.
- `run "task"` — one-shot task, prints final answer.
  - `--profile <name>`
- `tools list` — list available skills + manifests.
- `logs tail` — stream recent log lines.
- `logs export --out <file>` — export logs (planned).
- `secrets set <KEY>` — prompt for secret value.
- `secrets list` — list stored keys.
- `secrets delete <KEY>` — remove secret.
- `config path` — print config location.
- `profiles list` — list profile files (planned).
- `sessions list` / `sessions show <id>` — session history (planned).

## Global options
- `--profile <name>`
- `--model <alias>` (planned)
- `--config <path>` (planned override)
- `--quiet` / `--verbose`

## Examples
```bash
claw chat
claw --profile readonly chat
claw run "Summarize ARCHITECTURE.md"
claw tools list
claw logs tail
```
