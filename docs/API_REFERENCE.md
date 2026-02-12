# API Reference (Planned)

Status: Planned • Target: Phase 4

The HTTP API will mirror CLI capabilities for local integrations.

## Base URL
- Default: `http://localhost:4153`
- Auth: loopback-only during alpha; token-based auth planned for remote use.

## Planned endpoints
- `POST /chat` — streaming chat, supports tool calls.
- `POST /run` — one-shot task, returns final answer.
- `GET /sessions` — list sessions.
- `GET /sessions/{id}` — messages + tool calls.
- `POST /tools/{name}` — invoke a skill directly (guarded by policy).
- `GET /health` — liveness/readiness.

## Response shapes (draft)
```json
{
  "id": "session-123",
  "messages": [ ... ],
  "tools": [ ... ],
  "status": "active|completed|failed"
}
```

## Web UI
- Will sit on top of the same API.
- Features: live logs, profile editor, approvals inbox.

Until this lands, use the CLI.
