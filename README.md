# 🐾 BodhanClaw  

> A local-first, security-conscious AI agent that lives on your machine, not in someone’s cloud circus.  

> *“Any sufficiently advanced technology is indistinguishable from magic.”* — Arthur C. Clarke  
> *BodhanClaw insists that this “magic” runs on your machine and under your rules.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)  
[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-orange.svg)]()  

---

## 🎯 What is BodhanClaw?  

BodhanClaw is a local AI agent runtime that puts you back in control.  

It’s not:  
- ❌ Another cloud service that owns your data  
- ❌ A “framework” that abstracts everything into un-debuggable magic  
- ❌ A security afterthought with --allow-dangerous flags  

It is:  
- ✅ A daemon that runs on *your* machine  
- ✅ A security-first architecture where permissions are explicit  
- ✅ A modular system where you understand what’s happening  
- ✅ A tool that works with both remote (OpenAI, Anthropic) and local (Ollama, etc.) models  

Philosophy: your AI agent should be your employee, not your boss.  
You decide what it can access, what it can modify, and what always requires your explicit approval.

---

## 🔥 Why BodhanClaw exists  

After building [Arium](https://github.com/BOHDANMARCEN/arium) and experimenting with existing agent frameworks, a few patterns kept repeating:

1. Most frameworks are cloud-first  
   Your data, your conversations, your tasks — усе летить через чийсь чужий сервер.  

2. Security is bolted on later  
   Permissions, sandboxing, capabilities — “nice to have”, а не фундамент.  

3. Architecture is opaque  
   Важко зрозуміти, що реально відбувається і що саме зробив агент.  

4. Local models are second-class citizens  
   Більшість рішень припускають, що ти завжди платиш за API.  

BodhanClaw розвертає це навпаки:  

`text
┌─────────────────────────────────────────────────────┐
│  Traditional Agent Framework                        │
├─────────────────────────────────────────────────────┤
│  Cloud Service → Your Machine → Hope Nothing Breaks │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  BodhanClaw                                         │
├─────────────────────────────────────────────────────┤
│  Your Machine → Security Layer → Models (any) → You │
└─────────────────────────────────────────────────────┘


---

⚡ Core Principles

1. Local-First, Cloud-Optional

All data stays on your machine by default

Configuration, memory, logs — everything is local

Remote backends (APIs, cloud storage) are plugins, not requirements


2. Security by Design

Every skill has an explicit permission manifest

Default deny: if it’s not allowed, it doesn’t run

Critical actions require human confirmation

Full audit trail of what was executed and when


3. Human + AI, not AI instead of Human

The agent proposes, you approve (for dangerous operations)

Clear preview of what will happen before it happens

You can always say “no” or “I’ll do this manually”


4. Transparent Architecture

No black-box layers “that just do things”

You can read the code and understand what’s happening

Event-driven core with clear state transitions

Logs that make sense to humans


5. Model-Agnostic

Works with OpenAI, Anthropic, local Ollama, or any HTTP API

You choose the model based on task, cost, and privacy needs

Uses function calling / tools when available, with sane fallbacks when ні



---

🏗️ Architecture Overview

BodhanClaw is organized into clear layers:

Martseniuk Bogdan, [11.02.2026 12:08]
┌──────────────────────────────────────────────────┐
│  Interfaces: CLI / HTTP API / UI                 │
├──────────────────────────────────────────────────┤
│  Core: Task Engine, Event Bus, Agent Loop        │
├──────────────────────────────────────────────────┤
│  Security Layer: Policy Engine, Profiles, Audit  │
├──────────────────────────────────────────────────┤
│  Model Adapters: OpenAI / Local / Generic        │
├──────────────────────────────────────────────────┤
│  Skills: Filesystem / Shell / Git / HTTP / ...   │
├──────────────────────────────────────────────────┤
│  Memory: Sessions DB, Logs, Context              │
└──────────────────────────────────────────────────┘

Докладніше — у docs/ARCHITECTURE.md.

Claw Core (packages/core)

Core — це “мозок” BodhanClaw. Він відповідає за:

Task lifecycle: receive → plan → execute → respond

Agent loop:

LLM формує наступний крок (відповідь або tool call)

Security layer вирішує, чи можна це виконати

Skills виконують дію

Memory зберігає все, що сталося


Event Bus для логування, дебагу, UI та інтеграцій


Model Adapters (packages/models)

Плагінна система бекендів моделей:

OpenAIAdapter — офіційний OpenAI API

LocalOllamaAdapter — локальні моделі через Ollama

GenericHTTPAdapter — будь-який сумісний HTTP endpoint


Кожен адаптер:

уніфікує формат повідомлень і tool calls

вміє стрімити відповіді (де можливо)

реалізує ретраї та базовий error handling


Skills (packages/skills)

Skills — це дрібні інструменти з чіткими правами.

Кожен skill складається з:

коду (.ts, .py або бінарник)

маніфесту (manifest.yml), де описано:

що він робить

які ресурси може чіпати (FS, net, shell)

чи потрібне підтвердження користувача

схему аргументів



Приклад маніфесту:

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

Security & Policy Layer (packages/security)

Security — це окремий шар, а не “якось потім”.

Він включає:

Profiles: dev, home, work, readonly — з різними allowlists

Permission evaluator — перевірка кожного skill call

Confirmation flow — прев’ю небезпечних дій + явне yes/no від юзера

Secrets manager — локальне шифроване сховище для API-ключів


Скорочений threat model:

Ми припускаємо, що LLM може бути скомпрометований prompt-injection’ом.

Тому жодна відповідь моделі не вважається “довіреною” без policy check.

Ми довіряємо тільки:

локальному середовищу (OS security поза scope),

бінарю BodhanClaw,

локальній базі даних (за умови, що система не заражена root-malware).



Memory Layer (packages/memory)

Local-first пам’ять:

Short-term: поточний контекст задачі (messages, останні tool calls)

Task history: SQLite з сесіями, повідомленнями, викликами skills

Vector memory (опційно): локальні embeddings, щоб знаходити схожі задачі


Нічого не летить в чужу хмару, доки ти сам це явно не ввімкнеш.


---

🚀 Getting Started

Prerequisites

Node.js 20+

npm або pnpm

(Опційно) Ollama для локальних моделей


Installation

# Clone the repo
git clone https://github.com/BOHDANMARCEN/bodhanclaw.git
cd bodhanclaw

# Install dependencies
npm install

# Build
npm run build

# Initialize user config
npx claw init

Basic Usage

# Start an interactive chat session
claw chat

# Run a one-shot task
claw run "List all TypeScript files in this project"

# Use a specific profile
claw --profile readonly chat

# View available skills
claw tools list

# Tail recent logs
claw logs tail


---

⚙️ Configuration

Конфіг за замовчуванням живе в ~/.bodhanclaw/config.yml:

default_model: openai/gpt-4.1
default_profile: dev

models:
  openai:
    api_key_secret: OPENAI_API_KEY
    base_url: https://api.openai.com/v1

  local:
    type: ollama
    base_url: http://localhost:11434

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

Секрети задаються окремо:

Martseniuk Bogdan, [11.02.2026 12:08]
claw secrets set OPENAI_API_KEY
# Введи ключ у prompt (значення не логуються та не ехояться)


---

🛠️ Example: Safe Filesystem Access

User:

> “Прочитай мій README.md і зроби короткий конспект.”



Що відбувається:

1. LLM пропонує:
filesystem.read { "path": "~/project/README.md" }


2. Security layer перевіряє:

чи filesystem.read дозволений у поточному профілі? ✅

чи ~/project/ входить в fs.read allowlist? ✅

чи потрібне підтвердження? ❌ (read-only доступ)



3. Skill виконується → повертає вміст файлу


4. Audit log додає запис:
2026-02-10T14:32:11Z filesystem.read ~/project/README.md → success


5. LLM відповідає користувачу, вже з коротким конспектом



Якщо ж модель спробує:

{
  "tool": "shell.run",
  "args": { "cmd": "rm -rf /" }
}

Security layer:

бачить, що це небезпечна команда

генерує прев’ю для користувача:


⚠️  Agent wants to run shell command:

$ rm -rf /

This may DELETE FILES on your system.

Confirm? [y/N]:

За замовчуванням відповідь — N, команда не виконується.



---

🗺️ Roadmap

Phase 1: Living Daemon (Current)

✅ Minimal CLI (claw chat)

✅ OpenAI adapter

✅ Simple agent loop (без tools)

✅ Session history в SQLite


Phase 2: Skills + Security

🚧 Skill system з маніфестами

🚧 Policy engine (profiles, permissions)

🚧 Перші skills: filesystem.read, shell.run, git.status

🚧 Confirmation flow для небезпечних дій


Phase 3: Memory + Audit

⏳ Повна історія задач у SQLite

⏳ claw sessions list / claw session show <id>

⏳ Структуровані audit logs

⏳ Опційна vector memory для context search


Phase 4: API + UI

⏳ HTTP API (localhost:4153)

⏳ Web UI для керування сесіями

⏳ Профіль-редактор

⏳ Live log viewer


Future Ideas

Multi-agent coordination (локальний swarm)

Encrypted remote sync (multi-device, але still local-first)

Skill marketplace (community skills з репутаційною системою)

Інтеграція з локальним GPU / TPU / “server-in-a-box”



---

🤝 Contributing

BodhanClaw — це alpha software. Архітектура вже є, реалізація ще активно рухається.

Якщо хочеш долучитись:

1. Пройдися по docs/ARCHITECTURE.md


2. Подивись відкриті issues


3. Відкрий PR з чітким описом та, по можливості, тестами



Code of Conduct:

Будь добрим.

Будь конструктивним.

Не будь мудаком.



---

🧠 Philosophy & Inspiration

BodhanClaw надихається:

Unix philosophy: do one thing well, compose tools

Local-first software: research Ink & Switch

Capability-based security: least privilege first

Human–AI collaboration: інструменти для підсилення, а не заміни людини


Ми віримо, що:

AI-агенти мають бути асистентами, а не автономними “володарями системи”

Privacy — це фіча, а не преміум-опція

Security — це конструкторське обмеження, а не checkbox в кінці

Local compute стає важливішим, аніж будь-коли



---

📜 License

MIT License — див. файл LICENSE.


---

💬 Community & Support

Issues: GitHub Issues (в репозиторії)

Discussions: GitHub Discussions (якщо ввімкнено)

Discord: coming soon™



---

🐱 About the Name

Bodhan — людина, яка вірить у local-first, безпечний, людяний AI.

Claw — інструмент, що виконує роботу, але ніколи без явного дозволу.


Разом: BodhanClaw — AI-агент, який сильний, але завжди під твоїм контролем.


---

Built with ❤️ and healthy paranoia about cloud services.

BodhanClaw: Your machine. Your rules. Your agent.
