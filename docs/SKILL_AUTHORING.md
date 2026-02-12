# Skill Authoring Guide

Status: Alpha • Last updated: 2026-02-12

Skills are small, permission-scoped executables plus a manifest.

## Layout
```
packages/skills/
  filesystem.read/
    manifest.yml
    index.ts
```
Name your folder the same as `manifest.yml:name`.

## Manifest schema (minimum)
```yaml
name: "filesystem.read"
description: "Read a text file from a safe directory"
permissions:
  fs:
    read: ["~/workspace", "/project"]
    write: []
  net:
    outbound: []
  shell: false
user_confirmation:
  required: false
args:
  type: object
  properties:
    path: { type: string }
  required: [path]
```

## Code contract
- Entry should export `run(context)` returning JSON-serializable result.
- `context` contains: `args`, `env`, `logger`, `secrets`, `profile`.
- Return shape: `{ ok: true, data }` or `{ ok: false, error }`.

## Example (TypeScript)
```ts
import { readFile } from 'fs/promises';
import path from 'path';

export async function run({ args }: any) {
  const abs = path.resolve(args.path);
  const content = await readFile(abs, 'utf8');
  return { ok: true, data: content };
}
```
Security (paths, net) is enforced before your code runs.

## Best practices
- Keep skills single-purpose; avoid swiss-army tools.
- Declare the narrowest allowlists possible.
- Prefer returning structured data over free text.
- Log important steps via `logger.info/debug` (goes to event bus + audit when enabled).
- Avoid shelling out unless necessary; if you must, document why in manifest.

## Testing
- Provide unit tests per skill where possible.
- Add fixtures/examples under `__tests__/` or `examples/`.
- Manual: run via `claw tools run filesystem.read --path ./README.md` (command planned; for now, trigger through chat/run with tool call).

## Publishing (future)
- Skills will be installable via `claw skills install <source>`.
- Include README and changelog in skill folder.
