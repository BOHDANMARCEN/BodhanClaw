# Memory & Logging

Status: Alpha • Last updated: 2026-02-12

## Storage
- SQLite DB at `~/.bodhanclaw/state/claw.db` (path may change via config).
- Tables: `sessions`, `messages`, `tool_calls`, `audit_log`.
- Append-only: history is never mutated.

## What is stored
- Sessions: id, timestamps, profile, status, purpose.
- Messages: role, content, tool references.
- Tool calls: args (hashed or redacted when sensitive), result status, duration.
- Audit: permission decisions, confirmations, security events.

## Querying
- Direct SQLite queries (e.g., `sqlite3 ~/.bodhanclaw/state/claw.db "select * from audit_log order by created_at desc limit 20;"`).
- CLI helpers (planned): `claw sessions list/show`, `claw logs export`.

## Logs
- Human-readable logs under `~/.bodhanclaw/state/logs/*.log`.
- `claw logs tail` for live view.
- Log levels: info, warn, error, debug (set via config, planned flag `--verbose`).

## Backups
- Copy the state directory while the daemon is stopped.
- For long-term archives, dump SQLite: `sqlite3 claw.db ".backup claw-backup.db"`.

## Retention
- No automatic pruning in alpha. Monitor disk usage; you can archive old DBs manually.
