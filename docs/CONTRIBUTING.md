# Contributing

Status: Alpha • Last updated: 2026-02-12

We welcome careful, security-minded contributions.

## Ground rules
- Be kind. Be constructive. Don’t be a jerk.
- Security first: avoid expanding permissions without review.
- Tests when feasible; small, focused PRs.

## Workflow
1. Fork/branch from `main`.
2. `npm install && npm run build`.
3. Add/adjust tests (where available).
4. Run lint/tests (once they exist; for now `npm test` placeholder).
5. Open PR with: purpose, scope, risk, testing done.

## Areas needing help
- Skill system hardening (manifests, sandboxing).
- Additional model adapters.
- CLI UX + docs.
- Memory/Audit tooling.

## Code style
- TypeScript strict mode.
- Prefer async/await over callbacks.
- Keep functions small and side-effect-aware.

## Reporting security issues
- Please use responsible disclosure via private channel (open an issue asking for contact, don’t post exploits).
