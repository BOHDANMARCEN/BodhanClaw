# Security Model

Status: Alpha • Last updated: 2026-02-12

BodhanClaw is designed around least privilege and auditability.

## Threat model
Assumptions:
- LLM outputs can be malicious (prompt injection). Never trusted implicitly.
- Local machine integrity/OS security is out of scope; we assume the host is not already rooted.
- Network egress and filesystem access are controlled by policy.

## Principles
- **Default deny**: if a skill isn’t in the profile allowlist, it won’t run.
- **Human in the loop**: dangerous actions require explicit confirmation (unless `auto_confirm` is set, which you should reserve for read-only profiles).
- **Manifest-first**: each skill declares required permissions; no implicit privileges.
- **Audit everything**: every tool call + decision is written to append-only audit log.

## Execution flow with checks
1. Model proposes an action (tool call).
2. Security layer loads skill manifest.
3. Profile allowlist/denylist evaluated (skill name + paths/commands).
4. If flagged dangerous → confirmation prompt to user.
5. If allowed → skill runs; result + decision logged.

## Confirmation flow
- Preview shows command/path and impact.
- Default answer is **No**.
- Decision is recorded in audit log.

## Manifests
Minimal fields:
```yaml
name: filesystem.read
permissions:
  fs:
    read: ["~/workspace", "/project"]
  net:
    outbound: []
  shell: false
user_confirmation:
  required: false
```
- `fs.read`/`fs.write` are allowlists; empty list means **no** access.
- `net.outbound` empty means no network.
- `shell: false` disables shell execution inside the skill.

## Profiles & overrides
- Profiles can tighten manifests: narrower allowlists, extra dangerous patterns, forced confirmation.
- Example override: block `node_modules` writes even if manifest allows writes.

## Audit log
- Stored in SQLite (`audit_log` table).
- Records: timestamp, session, skill, args hash/summary, decision (allowed/denied), confirmation result.
- Use `claw logs tail` (human-readable) or query the DB for forensics.

## Safe defaults
- Keep `readonly` as the default interactive profile.
- Require confirmation for `shell.run` and `filesystem.write` in `dev`.
- Keep cloud models disabled unless you need them; set `default_model: local/...`.

## Supply-chain hygiene
- Review any community skill manifests before installing.
- Prefer local model when working with secrets.
- Never paste secrets into prompts; use `claw secrets set` + skill access instead.

## What’s out of scope (for now)
- MAC/RBAC at OS level
- Kernel hardening, sandboxing per skill process (planned)
- Network egress firewalling per skill (planned)
