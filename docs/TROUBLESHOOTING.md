# Troubleshooting

Status: Alpha • Last updated: 2026-02-12

## Common issues
- **"Permission denied" for a skill**: Your profile doesn’t allow it or path not in allowlist. Check `profiles/*.yml` and `manifest.yml`.
- **Confirmation prompt keeps appearing**: `user_confirmation.required` is true or profile override sets `require_confirmation`. Use a different profile or change override (with care).
- **OpenAI requests fail**: Missing/invalid key or network blocked. Run `claw secrets list` to ensure key exists; check `base_url`.
- **Ollama errors**: Ensure daemon is running (`ollama serve`) and model exists. Verify `base_url` and `model` in config.
- **Config parse error**: YAML indentation matters. Validate with `yamllint` or an online parser.
- **Windows path issues**: Use forward slashes or escape backslashes in YAML (`C:/Users/you/projects`).
- **No tool calls happening**: Model might not support tool calling (local models). Use OpenAI/Anthropic or add explicit prompt instructions.

## Getting more logs
- Run with verbose logging (planned flag) or inspect `~/.bodhanclaw/state/logs/`.
- Check `audit_log` table for denials.

## When stuck
- Try the `readonly` profile to see if basics work.
- File an issue with logs, config snippet (redact secrets), and steps to reproduce.
