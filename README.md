<div align="center">

# QCoder

**A local-first, autonomous AI coding agent powered by Ollama**

No cloud. No subscription. No data leaving your machine.

</div>

---

QCoder is a terminal-based coding agent that gives a local LLM the tools, context, and control loop needed to act autonomously — reading, writing, and running code in your projects. Think Claude Code, but 100% offline and free.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 18.0.0 | Required for ESM and native test runner |
| [Ollama](https://ollama.com) | Latest | Must be running before `qcoder` starts |
| `qwen2.5-coder:7b` | — | Default coding model |
| `nomic-embed-text` | — | Required for RAG (code context retrieval) |

> **Hardware:** 8 GB RAM minimum. QCoder auto-detects your hardware and recommends the right model size.

---

## Installation

### Step 1 — Clone and install

```bash
git clone <repo-url> qcoder
cd qcoder
npm install
```

### Step 2 — Pull required Ollama models

```bash
ollama pull qwen2.5-coder:7b
ollama pull nomic-embed-text
```

### Step 3 — Link the CLI globally *(optional but recommended)*

```bash
npm link
```

Now you can run `qcoder` from any directory.

---

## Quick Start

```bash
# Start Ollama
ollama serve

# Launch QCoder
qcoder

# Point it at your project
qcoder > project set /path/to/your/project

# Index the project for context-aware responses
qcoder > index build

# Start coding
qcoder > ask "refactor the authentication module to use async/await"
```

---

## How It Works

```
User prompt
    │
    ▼
Planner  ──→  Numbered plan displayed in terminal
    │
    ▼
Agent loop (max 15 steps)
    │
    ├── RAG retrieval   (relevant code chunks from your project)
    ├── Tool execution  (read_file, write_file, run_cmd, ...)
    ├── Permission gate (trust level controls what auto-runs)
    ├── Rollback        (every write is backed up first)
    └── Error recovery  (fingerprinted errors get known fixes)
    │
    ▼
`done` tool → task complete
```

Everything is stored locally in a `.qcoder/` directory inside your project.

---

## All Commands

### Core

| Command | Description |
|---------|-------------|
| `ask "<task>"` | Run a coding task autonomously |
| `ask "<task>" --dry` | Preview the plan without touching any files |
| `fix "<error>"` | Shorthand — examine the project and fix an error |
| `explain <file>` | Explain what a file does in plain English |

### Model

| Command | Description |
|---------|-------------|
| `model list` | List all locally installed Ollama models |
| `model use <name>` | Switch to a different model |
| `model scan` | Re-detect RAM/GPU and update the recommendation |
| `model current` | Show the active model |

### Sessions

| Command | Description |
|---------|-------------|
| `session new [name]` | Start a new session |
| `session list` | List all sessions for this project |
| `session switch <id>` | Switch session (loads prior summary as context) |
| `session rename <id> <name>` | Rename a session |

### Task Queue

| Command | Description |
|---------|-------------|
| `queue add "<task>"` | Add a task to the queue |
| `queue list` | List queued tasks and their status |
| `queue run` | Run all pending tasks in order |
| `queue resume` | Resume after a failed task |
| `queue remove <pos>` | Remove a pending task |
| `queue clear` | Clear all pending tasks |

### Project & RAG Index

| Command | Description |
|---------|-------------|
| `project set <path>` | Set the active project directory |
| `project status` | Show project info and index stats |
| `index build` | Index the project for context-aware responses |
| `index rebuild` | Clear and rebuild the index from scratch |
| `index status` | Show chunk count and last-indexed time |
| `index search "<query>"` | Manually search the index |

### Safety & History

| Command | Description |
|---------|-------------|
| `undo` | Revert the last file change |
| `undo all` | Revert all changes made in this session |
| `trust low\|medium\|high` | Set the agent's autonomy level |
| `errors list` | Show learned error patterns |
| `errors clear` | Clear the error pattern cache |

### Memory

| Command | Description |
|---------|-------------|
| `memory show` | Show persistent project facts |
| `memory clear` | Clear project memory |

### Other

| Command | Description |
|---------|-------------|
| `help` | Print the full command reference |

---

## Trust Levels

Trust controls how much the agent auto-approves vs asks for confirmation.

| Level | Read files | Write files | Run commands | Delete files |
|-------|-----------|-------------|-------------|-------------|
| `low` | Confirm | Confirm | Confirm | Always confirm |
| `medium` *(default)* | Auto | Auto | Confirm | Always confirm |
| `high` | Auto | Auto | Auto | **Always confirm** |

> **`delete_file` always asks, regardless of trust level.** This is hardcoded and cannot be overridden.

```bash
qcoder > trust high    # fully autonomous for a long task
qcoder > trust medium  # back to default after
```

---

## Safety Features

### Rollback (undo)

Every file write and delete is backed up **before** the operation. Backups are stored in `.qcoder/backups/session_<id>/`.

```bash
# Agent made a bad change?
qcoder > undo          # revert last change
qcoder > undo all      # revert everything in this session
```

### Dry Run

Preview exactly what the agent plans to do without touching any files:

```bash
qcoder > ask "restructure the project layout" --dry
```

Reads execute normally (needed for accurate planning). Writes and commands are logged but not applied.

### Ignore System

Files listed in `.qcoder/ignore` (one glob per line) are never read, written to, or indexed.

The following paths are **always ignored** regardless of your settings:

```
.env, .env.*, *.key, *.pem, *.cert
node_modules/**, .git/**, dist/**, build/**
.qcoder/**
```

---

## RAG — Code Context

QCoder indexes your project into a vector database using `nomic-embed-text`. When you run a task, it automatically retrieves the most relevant code and injects it into the prompt — so the agent understands your codebase without you having to paste files.

```bash
qcoder > index build          # first-time indexing
qcoder > index search "auth"  # find relevant chunks
```

The file watcher re-indexes changed files automatically in the background.

**Supported file types for AST-based chunking:** `.js`, `.ts`, `.jsx`, `.tsx`  
**Line-based chunking for:** `.py`, `.go`, `.rs`, `.java`, `.json`, `.md`, `.css`, `.html`, `.sql`

---

## Project Files

```
your-project/
├── .qcoder/              ← created automatically, add to .gitignore
│   ├── db.sqlite         ← sessions, messages, RAG chunks, error patterns
│   ├── memory.md         ← persistent project facts (hand-editable)
│   ├── ignore            ← project-specific ignore patterns
│   └── backups/          ← file backups for undo
└── ...your code...
```

Global user config is stored at `~/.qcoder/config.json`.

---

## Configuration

Most settings are stored in the `system_config` table in the project SQLite DB. You can inspect or change them directly:

```bash
# Open the DB
sqlite3 .qcoder/db.sqlite

# View all config
SELECT * FROM system_config;

# Change a value
UPDATE system_config SET value = '10' WHERE key = 'max_steps';
```

| Key | Default | Description |
|-----|---------|-------------|
| `recommended_model` | `qwen2.5-coder:7b` | Active Ollama model |
| `default_trust_level` | `medium` | Agent autonomy level |
| `max_steps` | `15` | Max tool calls per task |
| `run_cmd_timeout_ms` | `30000` | Command timeout (30s) |
| `rag_top_k` | `5` | Number of RAG chunks to inject |
| `rag_similarity_threshold` | `0.5` | Minimum cosine similarity for a chunk to be included |

---

## Running Tests

```bash
# Unit tests (no Ollama needed)
npm test

# Individual test files
node --test test/tools/read-file.test.js
node --test test/rag/chunker.test.js

# End-to-end scenarios (requires Ollama running)
node test/scenarios/fix-syntax-error.js
node test/scenarios/create-file.js
```

---

## Supported Models

| Model | RAM needed | Good for |
|-------|-----------|----------|
| `qwen2.5-coder:3b` | ~3 GB | Low-end hardware, fast |
| `qwen2.5-coder:7b` | ~5 GB | Daily use (recommended) |
| `qwen2.5-coder:14b` | ~10 GB | Higher accuracy |
| `deepseek-coder-v2:16b` | ~12 GB | Strong on complex refactors |

Use `model scan` to get an automatic recommendation based on your system, or `model use <name>` to switch.

---

## Hardware Requirements

| RAM | Recommended model |
|-----|-------------------|
| 4–8 GB | `qwen2.5-coder:3b` |
| 8–16 GB | `qwen2.5-coder:7b` |
| 16 GB+ | `qwen2.5-coder:14b` |
| 16 GB+ with GPU | `qwen2.5-coder:32b` |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE)
