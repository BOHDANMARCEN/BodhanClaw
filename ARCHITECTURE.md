# BodhanClaw Architecture

> **Deep dive into how BodhanClaw works, why it's designed this way, and how to reason about it.**

**Last Updated**: 2026-02-11  
**Status**: Living Document (Alpha Phase)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Layers](#core-layers)
3. [Data Flow](#data-flow)
4. [Security Model](#security-model)
5. [Skill System](#skill-system)
6. [Memory & Context](#memory--context)
7. [Model Adapters](#model-adapters)
8. [Event System](#event-system)
9. [Design Decisions](#design-decisions)
10. [Future Considerations](#future-considerations)

---

## Architecture Overview

### High-Level Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACES                         │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────────┐   │
│  │   CLI    │  │ HTTP API │  │  Web UI (future)        │   │
│  └────┬─────┘  └────┬─────┘  └───────────┬─────────────┘   │
└───────┼─────────────┼────────────────────┼─────────────────┘
        │             │                    │
        └─────────────┴────────────────────┘
                      │
        ┌─────────────▼───────────────┐
        │      CLAW CORE ENGINE       │
        │  ┌──────────────────────┐   │
        │  │   Task Orchestrator  │   │
        │  │   Agent Loop         │   │
        │  │   Event Bus          │   │
        │  └──────────────────────┘   │
        └─────────────┬───────────────┘
                      │
        ┌─────────────┴───────────────┐
        │                             │
  ┌─────▼──────┐              ┌──────▼─────┐
  │  SECURITY  │              │   MEMORY   │
  │   LAYER    │              │   LAYER    │
  │            │              │            │
  │ • Policy   │              │ • Sessions │
  │ • Profiles │              │ • History  │
  │ • Secrets  │              │ • Context  │
  │ • Audit    │              │ • Vectors  │
  └─────┬──────┘              └──────┬─────┘
        │                            │
        └────────────┬───────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
  ┌─────▼──────┐          ┌──────▼──────┐
  │   MODEL    │          │   SKILLS    │
  │  ADAPTERS  │          │   SYSTEM    │
  │            │          │             │
  │ • OpenAI   │          │ • fs.read   │
  │ • Local    │          │ • shell.run │
  │ • Generic  │          │ • git.*     │
  └────────────┘          │ • custom    │
                          └─────────────┘
```

### Design Philosophy

BodhanClaw is built on **layered isolation**:

1. **User layer** never touches models directly
2. **Core** orchestrates, but doesn't execute
3. **Security** sits between core and execution
4. **Skills** are sandboxed and audited
5. **Memory** is queryable but immutable (append-only)

**Key insight**: If an attacker compromises the LLM (prompt injection), they still can't bypass security or access unauthorized resources.

---

## Core Layers

### 1. Claw Core (`packages/core`)

The core is **stateless** — all state lives in Memory Layer. Core just orchestrates.

#### Components

```typescript
// packages/core/src/index.ts

export interface ClawCore {
  // Main entry points
  runTask(task: TaskRequest): Promise<TaskResult>;
  runChatSession(sessionId: string): Promise<void>;
  
  // Internal orchestration
  executeAgentLoop(state: AgentState): Promise<AgentState>;
  
  // Event handling
  on(event: string, handler: EventHandler): void;
  emit(event: string, data: unknown): void;
}
```

#### Agent Loop

The core loop is a simple state machine:

```
                    ┌──────────────┐
                    │   START      │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  PLAN_NEXT   │◄────────┐
                    │  ACTION      │         │
                    └──────┬───────┘         │
                           │                 │
                    ┌──────▼───────┐         │
             ┌──────┤  LLM_CALL    │         │
             │      └──────┬───────┘         │
             │             │                 │
             │      ┌──────▼───────┐         │
             │      │  PARSE_PLAN  │         │
             │      └──────┬───────┘         │
             │             │                 │
             │      ┌──────▼───────┐         │
             │  ┌───┤  TOOL_CALL?  ├───┐     │
             │  │   └──────────────┘   │     │
             │  │ YES              NO  │     │
             │  │                      │     │
             │  ▼                      ▼     │
             │ ┌──────────┐      ┌────────┐ │
             │ │ SECURITY │      │ FINAL  │ │
             │ │ CHECK    │      │RESPONSE│ │
             │ └────┬─────┘      └───┬────┘ │
             │      │                │      │
             │   ┌──▼────┐           │      │
             │   │EXECUTE│           │      │
             │   │ TOOL  │           │      │
             │   └──┬────┘           │      │
             │      │                │      │
             │   ┌──▼────┐           │      │
             │   │UPDATE │           │      │
             │   │ STATE │           │      │
             │   └──┬────┘           │      │
             │      │                │      │
             └──────┴────────────────┴──────┘
                           │
                    ┌──────▼───────┐
                    │     END      │
                    └──────────────┘
```

**Pseudocode**:

```typescript
async function executeAgentLoop(state: AgentState): Promise<AgentState> {
  while (!state.isComplete) {
    // 1. Get next action from LLM
    const response = await model.generate({
      messages: state.messages,
      tools: getAvailableTools(state.profile),
    });
    
    // 2. Parse response
    if (response.type === 'tool_call') {
      // 3. Security check
      const allowed = await security.checkPermission(
        response.tool,
        response.args,
        state.profile
      );
      
      if (!allowed) {
        state.messages.push({
          role: 'tool_result',
          content: 'Permission denied',
        });
        continue;
      }
      
      // 4. Execute tool
      const result = await skills.execute(
        response.tool,
        response.args,
        state.context
      );
      
      // 5. Update state
      state.messages.push({
        role: 'tool_result',
        tool: response.tool,
        content: result,
      });
      
      // 6. Emit event for logging/UI
      events.emit('tool_executed', {
        tool: response.tool,
        result,
        timestamp: Date.now(),
      });
      
    } else if (response.type === 'final_answer') {
      state.isComplete = true;
      state.finalAnswer = response.content;
    }
  }
  
  return state;
}
```

---

### 2. Security Layer (`packages/security`)

The security layer is **the gatekeeper**. Nothing executes without passing through it.

#### Components

```typescript
// packages/security/src/index.ts

export interface SecurityLayer {
  // Permission checking
  checkPermission(
    skill: string,
    args: unknown,
    profile: Profile
  ): Promise<PermissionResult>;
  
  // User confirmation
  requestConfirmation(
    skill: string,
    args: unknown,
    preview: string
  ): Promise<boolean>;
  
  // Secrets management
  getSecret(key: string): Promise<string | null>;
  setSecret(key: string, value: string): Promise<void>;
  
  // Audit logging
  logAction(action: AuditAction): Promise<void>;
}
```

#### Permission Model

Permissions are **explicit and composable**:

```yaml
# ~/.bodhanclaw/profiles/dev.yml
name: dev
description: Development work with limited shell access

allowed_skills:
  - filesystem.read
  - filesystem.write
  - git.*
  - shell.run

skill_overrides:
  filesystem.write:
    path_allowlist:
      - ~/projects/**
      - /tmp/**
    path_denylist:
      - ~/.ssh/**
      - ~/projects/**/node_modules/**
  
  shell.run:
    require_confirmation: true
    command_allowlist:
      - ls
      - cat
      - git *
      - npm *
    dangerous_patterns:
      - rm -rf
      - sudo
      - chmod 777

auto_confirm: false
audit_verbose: true
```

#### Security Check Algorithm

```typescript
async function checkPermission(
  skill: string,
  args: Record<string, unknown>,
  profile: Profile
): Promise<PermissionResult> {
  // 1. Is skill allowed in this profile?
  const skillAllowed = profile.allowed_skills.some(pattern => 
    matchGlob(skill, pattern)
  );
  
  if (!skillAllowed) {
    return { allowed: false, reason: 'skill_not_in_profile' };
  }
  
  // 2. Load skill manifest
  const manifest = await loadSkillManifest(skill);
  
  // 3. Check against manifest permissions
  for (const [resource, required] of Object.entries(manifest.permissions)) {
    if (resource === 'fs' && required.write?.length) {
      const requestedPath = args.path as string;
      const normalized = path.resolve(requestedPath);
      
      // Check against profile overrides
      const override = profile.skill_overrides?.[skill];
      const allowlist = override?.path_allowlist || required.write;
      const denylist = override?.path_denylist || [];
      
      if (!matchesAnyPattern(normalized, allowlist)) {
        return { allowed: false, reason: 'path_not_in_allowlist' };
      }
      
      if (matchesAnyPattern(normalized, denylist)) {
        return { allowed: false, reason: 'path_in_denylist' };
      }
    }
    
    if (resource === 'shell' && required === true) {
      const command = args.cmd as string;
      const override = profile.skill_overrides?.[skill];
      
      // Check for dangerous patterns
      for (const pattern of override?.dangerous_patterns || []) {
        if (command.includes(pattern)) {
          return { 
            allowed: false, 
            reason: 'dangerous_command_pattern',
            requiresConfirmation: true 
          };
        }
      }
    }
  }
  
  // 4. Check if confirmation required
  const needsConfirm = 
    manifest.user_confirmation?.required ||
    profile.skill_overrides?.[skill]?.require_confirmation;
  
  if (needsConfirm && !profile.auto_confirm) {
    return { 
      allowed: false, 
      reason: 'requires_user_confirmation',
      requiresConfirmation: true 
    };
  }
  
  return { allowed: true };
}
```

#### User Confirmation Flow

When a skill requires confirmation:

```typescript
async function requestConfirmation(
  skill: string,
  args: unknown,
  preview: string
): Promise<boolean> {
  // Generate human-readable preview
  const formatted = formatActionPreview(skill, args, preview);
  
  console.log('\n⚠️  Agent wants to perform action:\n');
  console.log(formatted);
  console.log('\nConfirm? [y/N]: ');
  
  const answer = await readUserInput();
  
  // Log confirmation decision
  await audit.log({
    event: 'user_confirmation',
    skill,
    args,
    decision: answer.toLowerCase() === 'y' ? 'approved' : 'denied',
    timestamp: Date.now(),
  });
  
  return answer.toLowerCase() === 'y';
}
```

Example output:

```
⚠️  Agent wants to perform action:

Skill: shell.run
Command: rm -rf /tmp/old_build

This will:
  • DELETE all files in /tmp/old_build (recursively)
  • This action CANNOT be undone

Confirm? [y/N]: _
```

---

### 3. Memory Layer (`packages/memory`)

Memory is **append-only** and **queryable**. We never mutate history.

#### Schema (SQLite)

```sql
-- Sessions: high-level task containers
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  profile TEXT NOT NULL,
  purpose TEXT,
  status TEXT CHECK(status IN ('active', 'completed', 'failed', 'abandoned')),
  metadata JSON
);

-- Messages: the conversation
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT CHECK(role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  tool_name TEXT,
  tool_args JSON,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Tool calls: detailed execution log
CREATE TABLE tool_calls (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id TEXT,
  tool_name TEXT NOT NULL,
  args JSON NOT NULL,
  result JSON,
  status TEXT CHECK(status IN ('pending', 'success', 'failed', 'denied')),
  duration_ms INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- Audit log: immutable security events
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  event_type TEXT NOT NULL,
  actor TEXT CHECK(actor IN ('user', 'agent', 'system')),
  details JSON NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Indexes for common queries
CREATE INDEX idx_sessions_created ON sessions(created_at DESC);
CREATE INDEX idx_messages_session ON messages(session_id, created_at);
CREATE INDEX idx_tool_calls_session ON tool_calls(session_id, created_at);
CREATE INDEX idx_audit_log_session ON audit_log(session_id, created_at);
CREATE INDEX idx_audit_log_event ON audit_log(event_type, created_at);
```

#### Memory Interface

```typescript
// packages/memory/src/index.ts

export interface MemoryLayer {
  // Session management
  createSession(purpose: string, profile: string): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  listSessions(opts: ListOptions): Promise<Session[]>;
  updateSession(id: string, updates: Partial<Session>): Promise<void>;
  
  // Message history
  addMessage(sessionId: string, message: Message): Promise<void>;
  getMessages(sessionId: string, opts?: QueryOptions): Promise<Message[]>;
  
  // Tool execution log
  logToolCall(sessionId: string, call: ToolCall): Promise<void>;
  getToolCalls(sessionId: string): Promise<ToolCall[]>;
  
  // Audit trail
  logAudit(event: AuditEvent): Promise<void>;
  queryAudit(filter: AuditFilter): Promise<AuditEvent[]>;
  
  // Context search (future: vector-based)
  searchSimilarSessions(query: string, limit: number): Promise<Session[]>;
}
```

#### Context Window Management

For long sessions, we need to manage LLM context:

```typescript
async function buildContextWindow(
  sessionId: string,
  maxTokens: number = 8000
): Promise<Message[]> {
  const messages = await memory.getMessages(sessionId);
  
  // Always keep system prompt + first user message
  const systemMessages = messages.filter(m => m.role === 'system');
  const firstUser = messages.find(m => m.role === 'user');
  
  let budget = maxTokens - estimateTokens([...systemMessages, firstUser]);
  let context = [...systemMessages, firstUser];
  
  // Add recent messages in reverse order
  const recent = messages.slice().reverse();
  for (const msg of recent) {
    if (msg === firstUser) continue;
    
    const cost = estimateTokens([msg]);
    if (budget - cost < 0) break;
    
    context.push(msg);
    budget -= cost;
  }
  
  return context.sort((a, b) => a.created_at - b.created_at);
}
```

---

### 4. Skill System (`packages/skills`)

Skills are **isolated executables** with **explicit contracts**.

#### Skill Structure

```
packages/skills/
  builtin/
    filesystem/
      read/
        manifest.yml
        index.ts
        index.test.ts
      write/
        manifest.yml
        index.ts
    shell/
      run/
        manifest.yml
        index.ts
    git/
      status/
        manifest.yml
        index.ts
  custom/
    (user-defined skills)
```

#### Skill Manifest

```yaml
# packages/skills/builtin/filesystem/write/manifest.yml

name: filesystem.write
version: 1.0.0
description: Write content to a file in an allowed directory

entry: ./index.ts
runtime: node

permissions:
  fs:
    read: []
    write: ["~/workspace", "/tmp"]
  net:
    outbound: []
  shell: false

user_confirmation:
  required: false
  preview: "Write {bytes} bytes to {path}"

parameters:
  type: object
  required: [path, content]
  properties:
    path:
      type: string
      description: Absolute or relative file path
    content:
      type: string
      description: Content to write
    encoding:
      type: string
      enum: [utf-8, ascii, base64]
      default: utf-8

cost_estimate:
  time: fast
  risk: medium
  reversible: false

examples:
  - description: Write a simple text file
    args:
      path: ~/workspace/notes.txt
      content: "Hello world"
  
  - description: Create a config file
    args:
      path: /tmp/config.json
      content: '{"debug": true}'
```

#### Skill Implementation

```typescript
// packages/skills/builtin/filesystem/write/index.ts

import { promises as fs } from 'fs';
import { resolve } from 'path';

export interface SkillContext {
  args: unknown;
  sessionId: string;
  logger: Logger;
  abortSignal: AbortSignal;
}

export interface SkillResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface WriteArgs {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'ascii' | 'base64';
}

export async function run(ctx: SkillContext): Promise<SkillResult> {
  const { path, content, encoding = 'utf-8' } = ctx.args as WriteArgs;
  
  try {
    // Validate args
    if (!path || typeof path !== 'string') {
      return { ok: false, error: 'Invalid path' };
    }
    
    if (typeof content !== 'string') {
      return { ok: false, error: 'Content must be a string' };
    }
    
    // Resolve path
    const resolved = resolve(path);
    
    ctx.logger.info(`Writing ${content.length} bytes to ${resolved}`);
    
    // Check for abort signal
    if (ctx.abortSignal.aborted) {
      return { ok: false, error: 'Operation aborted' };
    }
    
    // Perform write
    await fs.writeFile(resolved, content, { encoding });
    
    return {
      ok: true,
      data: { path: resolved, bytes: content.length },
      metadata: { encoding, timestamp: Date.now() }
    };
    
  } catch (err) {
    ctx.logger.error(`Write failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// Optional: cleanup or validation hooks
export async function validate(args: unknown): Promise<string | null> {
  const { path, content } = args as WriteArgs;
  
  if (!path) return 'path is required';
  if (!content) return 'content is required';
  
  return null; // valid
}
```

#### Skill Loading & Execution

```typescript
// packages/core/src/skillManager.ts

class SkillManager {
  private skills: Map<string, LoadedSkill> = new Map();
  
  async loadSkill(name: string): Promise<LoadedSkill> {
    if (this.skills.has(name)) {
      return this.skills.get(name)!;
    }
    
    // Find skill manifest
    const manifestPath = await this.findSkillManifest(name);
    if (!manifestPath) {
      throw new Error(`Skill not found: ${name}`);
    }
    
    // Load and validate manifest
    const manifest = await this.loadManifest(manifestPath);
    await this.validateManifest(manifest);
    
    // Load entry point
    const entryPath = resolve(dirname(manifestPath), manifest.entry);
    const module = await import(entryPath);
    
    if (!module.run || typeof module.run !== 'function') {
      throw new Error(`Skill ${name} missing run() function`);
    }
    
    const skill: LoadedSkill = { manifest, module, path: entryPath };
    this.skills.set(name, skill);
    
    return skill;
  }
  
  async execute(
    name: string,
    args: unknown,
    context: ExecutionContext
  ): Promise<SkillResult> {
    const skill = await this.loadSkill(name);
    
    // Validate args against schema
    if (skill.module.validate) {
      const error = await skill.module.validate(args);
      if (error) {
        return { ok: false, error };
      }
    }
    
    // Create abort controller
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    try {
      // Execute with context
      const result = await skill.module.run({
        args,
        sessionId: context.sessionId,
        logger: context.logger,
        abortSignal: controller.signal,
      });
      
      return result;
      
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

---

## Data Flow

### Complete Request Flow

Here's what happens when a user sends "Create a Python script to parse CSV":

```
┌──────────────┐
│   USER CLI   │
└──────┬───────┘
       │ "Create a Python script to parse CSV"
       │
┌──────▼──────────────────────────────────────────────┐
│  CORE: Create session, load profile                 │
└──────┬──────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│  MEMORY: Store initial message                      │
└──────┬──────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│  CORE: Build context window                         │
│  - System prompt                                     │
│  - Available tools (filtered by profile)            │
│  - User message                                      │
└──────┬──────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│  MODEL ADAPTER: Call LLM                            │
│  → OpenAI API                                        │
└──────┬──────────────────────────────────────────────┘
       │
       │ LLM Response: tool_call(filesystem.write, {...})
       │
┌──────▼──────────────────────────────────────────────┐
│  CORE: Parse response, identify tool call           │
└──────┬──────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│  SECURITY: Check permission                          │
│  - Is filesystem.write allowed in profile?          │
│  - Is target path in allowlist?                     │
│  - Does it need confirmation?                       │
└──────┬──────────────────────────────────────────────┘
       │ ✅ Allowed
       │
┌──────▼──────────────────────────────────────────────┐
│  SKILL MANAGER: Load & execute filesystem.write     │
└──────┬──────────────────────────────────────────────┘
       │ ✅ Success: file created
       │
┌──────▼──────────────────────────────────────────────┐
│  MEMORY: Log tool call result                       │
└──────┬──────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│  AUDIT: Record action                                │
│  [2026-02-11T10:32:11Z] filesystem.write             │
│    → /home/user/workspace/parse_csv.py               │
└──────┬──────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│  CORE: Add tool result to context, call LLM again   │
└──────┬──────────────────────────────────────────────┘
       │
       │ LLM Response: final_answer("I've created...")
       │
┌──────▼──────────────────────────────────────────────┐
│  CORE: Task complete                                 │
└──────┬──────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│  USER CLI: Display response                          │
└──────────────────────────────────────────────────────┘
```

---

## Model Adapters

### Interface

All model adapters implement the same interface:

```typescript
// packages/models/src/types.ts

export interface ModelAdapter {
  name: string;
  
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  streamGenerate(request: GenerateRequest): AsyncGenerator<StreamChunk>;
  
  supportsToolCalling: boolean;
  supportedFeatures: ModelFeatures;
}

export interface GenerateRequest {
  messages: Message[];
  tools?: Tool[];
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface GenerateResponse {
  type: 'text' | 'tool_call' | 'error';
  content?: string;
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
  finishReason?: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
}
```

### OpenAI Adapter

```typescript
// packages/models/src/adapters/openai.ts

import OpenAI from 'openai';

export class OpenAIAdapter implements ModelAdapter {
  name = 'openai';
  supportsToolCalling = true;
  supportedFeatures = {
    streaming: true,
    functionCalling: true,
    vision: true,
  };
  
  private client: OpenAI;
  
  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }
  
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: this.convertMessages(request.messages),
        tools: request.tools ? this.convertTools(request.tools) : undefined,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      });
      
      const choice = completion.choices[0];
      
      if (choice.finish_reason === 'tool_calls') {
        return {
          type: 'tool_call',
          toolCalls: choice.message.tool_calls?.map(tc => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          })),
          usage: {
            promptTokens: completion.usage?.prompt_tokens,
            completionTokens: completion.usage?.completion_tokens,
          },
        };
      }
      
      return {
        type: 'text',
        content: choice.message.content || '',
        usage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
        },
      };
      
    } catch (error) {
      return {
        type: 'error',
        content: error.message,
      };
    }
  }
  
  private convertMessages(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: msg.toolCallId!,
          content: JSON.stringify(msg.content),
        };
      }
      
      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      };
    });
  }
  
  private convertTools(tools: Tool[]): OpenAI.ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }
}
```

### Local (Ollama) Adapter

```typescript
// packages/models/src/adapters/ollama.ts

export class OllamaAdapter implements ModelAdapter {
  name = 'ollama';
  supportsToolCalling = false; // Most local models don't support this yet
  supportedFeatures = {
    streaming: true,
    functionCalling: false,
    vision: false,
  };
  
  private baseUrl: string;
  private model: string;
  
  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'llama2';
  }
  
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    // For models without tool calling, we simulate it via prompt engineering
    const prompt = this.buildPrompt(request);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
        }),
      });
      
      const data = await response.json();
      
      // Try to parse tool calls from response
      const toolCall = this.parseToolCall(data.response);
      
      if (toolCall) {
        return {
          type: 'tool_call',
          toolCalls: [toolCall],
        };
      }
      
      return {
        type: 'text',
        content: data.response,
      };
      
    } catch (error) {
      return {
        type: 'error',
        content: error.message,
      };
    }
  }
  
  private buildPrompt(request: GenerateRequest): string {
    let prompt = '';
    
    for (const msg of request.messages) {
      if (msg.role === 'system') {
        prompt += `${msg.content}\n\n`;
      } else if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Assistant: ${msg.content}\n\n`;
      }
    }
    
    // Add tool instructions if tools are available
    if (request.tools?.length) {
      prompt += 'Available tools:\n';
      for (const tool of request.tools) {
        prompt += `- ${tool.name}: ${tool.description}\n`;
      }
      prompt += '\nTo use a tool, respond with: TOOL_CALL: {name: "tool_name", args: {...}}\n\n';
    }
    
    prompt += 'Assistant: ';
    
    return prompt;
  }
  
  private parseToolCall(text: string): ToolCall | null {
    const match = text.match(/TOOL_CALL:\s*({.*})/);
    if (!match) return null;
    
    try {
      const parsed = JSON.parse(match[1]);
      return {
        id: Math.random().toString(36),
        name: parsed.name,
        arguments: parsed.args,
      };
    } catch {
      return null;
    }
  }
}
```

---

## Event System

### Event Bus

```typescript
// packages/core/src/events.ts

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  
  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    this.handlers.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }
  
  emit(event: string, data: unknown): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
  }
  
  async emitAsync(event: string, data: unknown): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    
    await Promise.all(
      Array.from(handlers).map(handler => 
        Promise.resolve(handler(data))
      )
    );
  }
}
```

### Event Types

```typescript
// Core events
export type ClawEvent =
  | { type: 'task_started'; sessionId: string; purpose: string }
  | { type: 'task_completed'; sessionId: string; duration: number }
  | { type: 'task_failed'; sessionId: string; error: string }
  | { type: 'llm_call'; sessionId: string; model: string; tokens: number }
  | { type: 'tool_called'; sessionId: string; tool: string; args: unknown }
  | { type: 'tool_result'; sessionId: string; tool: string; result: unknown; duration: number }
  | { type: 'permission_denied'; sessionId: string; tool: string; reason: string }
  | { type: 'user_confirmation_requested'; sessionId: string; tool: string; preview: string }
  | { type: 'user_confirmation_response'; sessionId: string; approved: boolean }
  | { type: 'audit_log_entry'; entry: AuditEntry };
```

### Usage Example

```typescript
// In CLI
events.on('tool_called', (data) => {
  console.log(`🔧 Calling ${data.tool}...`);
});

events.on('tool_result', (data) => {
  if (data.result.ok) {
    console.log(`✅ ${data.tool} completed in ${data.duration}ms`);
  } else {
    console.log(`❌ ${data.tool} failed: ${data.result.error}`);
  }
});

// In audit logger
events.on('tool_called', async (data) => {
  await memory.logAudit({
    event: 'tool_execution',
    sessionId: data.sessionId,
    details: { tool: data.tool, args: data.args },
    timestamp: Date.now(),
  });
});
```

---

## Design Decisions

### Why TypeScript for Core?

**Pros**:
- Type safety reduces bugs in orchestration logic
- Great async/await support for LLM calls
- Rich ecosystem (OpenAI SDK, etc.)
- Easy to refactor as architecture evolves
- You're already comfortable with it from Arium

**Cons**:
- Slightly slower than Rust/Go
- Node.js dependency (but that's fine for local daemon)

**Decision**: TypeScript is the right choice for **v1**. We can always rewrite performance-critical parts in Rust later if needed.

---

### Why SQLite for Memory?

**Pros**:
- Zero-config, single-file database
- Excellent for local-first architecture
- Fast enough for thousands of sessions
- ACID transactions for audit log
- Can be backed up by copying one file

**Cons**:
- Not ideal for multi-process writes (but we have single daemon)
- Limited concurrency (fine for our use case)

**Decision**: SQLite is perfect for BodhanClaw's local-first model. DuckDB can be added later for analytics.

---

### Why Manifest-Based Skills?

**Alternative considered**: Dynamic skill discovery (scan directories, auto-load)

**Problems with alternatives**:
- Hard to audit what skills are available
- Easy to accidentally enable dangerous skills
- No clear permission boundaries

**Our approach**: Explicit manifests
- Security reviewable before execution
- Clear contract between core and skill
- Easy to understand what a skill can/cannot do

---

### Why Append-Only Audit Log?

**Alternative considered**: Mutable log that can be "cleaned up"

**Problems**:
- Makes forensics impossible
- Violates principle of auditability
- Could hide security incidents

**Our approach**: Append-only
- Can't hide what happened
- Can query historical actions
- Disk space is cheap

---

## Future Considerations

### Multi-Agent Coordination

```typescript
// Future API (not implemented yet)
interface AgentSwarm {
  spawn(agentType: string, task: Task): Promise<Agent>;
  coordinate(agents: Agent[], goal: string): Promise<Result>;
  killAll(): Promise<void>;
}

// Use case: "Research topic X, write blog post, create social posts"
const researcher = await swarm.spawn('researcher', { topic: 'AI safety' });
const writer = await swarm.spawn('writer', { style: 'technical' });
const social = await swarm.spawn('social', { platforms: ['twitter', 'linkedin'] });

await swarm.coordinate([researcher, writer, social], 'Create content pipeline');
```

**Challenges**:
- Inter-agent communication protocol
- Shared memory or separate?
- How to handle conflicting actions
- Security: can agents call each other's skills?

---

### Encrypted Remote Sync

For users with multiple devices:

```yaml
# Future config
sync:
  enabled: true
  backend: s3
  encryption: age
  public_key: age1abc...
  
  sync_items:
    - sessions
    - tool_history
  
  exclude:
    - secrets
    - audit_log  # always local-only
```

**Challenges**:
- Key management
- Conflict resolution
- Bandwidth for large histories

---

### Skill Marketplace

```bash
claw skills search "git workflow"
claw skills install community/git-pr-helper
claw skills review community/git-pr-helper  # show manifest + code
```

**Challenges**:
- Trust model (how to verify skills are safe?)
- Versioning
- Dependency management
- Reputation system

---

## Conclusion

This architecture is designed to be:
- **Secure by default**
- **Transparent and auditable**
- **Easy to reason about**
- **Extensible without breaking core**

The key insight: **Trust is earned through design**, not through promises.

By putting security, privacy, and user control at the center of the architecture—not bolting them on later—BodhanClaw can be a foundation for powerful AI agents that users actually trust.

---

**Next Steps**:
1. Implement Core + Event Bus
2. Implement Security Layer
3. Implement 2-3 basic skills
4. Implement Memory Layer
5. Build CLI interface

**Questions? Concerns?**  
Open an issue or discussion on GitHub.

---

*"The agent proposes. The human disposes. Always."*
