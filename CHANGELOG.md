# Changelog

All notable changes to QCoder will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [0.1.0] — 2026-04-19

### First release — Terminal agent MVP

#### Added

**Core agent loop**
- Autonomous agent runner with configurable `max_steps` (default 15)
- Separate planning phase: model writes a numbered plan before executing any tool
- Streaming token output — terminal shows response as it arrives, not after
- `done` tool signals task completion with a one-sentence summary
- Parse retry logic: up to 3 attempts to extract valid JSON from model response

**Tools**
- `read_file` — reads file content; blocked by ignore system
- `write_file` — backs up before writing; shows diff preview
- `create_file` — creates parent directories automatically
- `delete_file` — **always** asks for confirmation regardless of trust level
- `list_files` — recursive directory listing filtered by ignore patterns
- `run_cmd` — whitelisted commands only (`node`, `npm`, `git`, `python`, etc.); 30s timeout
- `save_memory` — appends facts to `.qcoder/memory.md` with deduplication

**Safety system**
- `RollbackManager` — backs up every file before write/delete; `undo` and `undo all`
- Trust levels: `low`, `medium` (default), `high`
- Hardcoded ignore list: `.env`, `*.key`, `node_modules/**`, `.git/**`, etc.
- Dry-run mode (`--dry` flag) — reads execute normally, writes are logged only
- Error fingerprinting — same error class recognised across files/line numbers; known fixes injected

**RAG context system**
- AST-based chunking for JS/TS (functions, classes, arrow functions)
- 60-line sliding window fallback for all other file types
- `nomic-embed-text` embeddings via Ollama
- Cosine similarity retrieval with configurable `topK` and similarity threshold
- Background file watcher (`chokidar`) auto-re-indexes changed files
- `topK` and `similarity_threshold` stored in `system_config`, not hardcoded

**Context window management**
- Sliding window fits recent messages in 4500-token budget
- Lazy summary compression: older messages summarised by model on first overflow
- Summary cached in `sessions.summary`, reused across calls
- Session resume: prior summary injected as first context message

**CLI terminal**
- terminal-kit based renderer (cross-platform: Windows Terminal, CMD, PowerShell)
- Command history (up/down arrows) and tab autocomplete via `term.inputField()`
- All 14 commands: `ask`, `fix`, `explain`, `model`, `session`, `queue`, `memory`, `index`, `project`, `errors`, `undo`, `trust`, `help`
- Task queue with `pending → running → done | failed` state machine
- Modular command handler structure — one file per command, thin router in `terminal/index.js`

**Persistence (SQLite)**
- Tables: `sessions`, `messages`, `task_queue`, `rollback_log`, `rag_chunks`, `rag_meta`, `error_patterns`, `system_config`
- WAL journal mode for concurrent read safety
- Safe to re-run schema on every startup (`CREATE TABLE IF NOT EXISTS`)

**Health check**
- Checks Ollama running, coding model, embedding model (exact string match), free RAM, project path
- Exits with code 1 on fatal failures; warns on RAM and missing project path
- CTRL+C handler: closes file watcher, flushes SQLite, prints goodbye

**Testing**
- 47 unit tests across 11 test files, all passing
- Node.js native test runner (`node:test`) — no external test framework
- Test helper `createTestProject()` for isolated temp directories
- 2 end-to-end scenario scripts (require Ollama)

---

## [Unreleased] — planned for v0.2

- REST API server (`express`, port configurable) for VS Code extension integration
- VS Code extension (side panel + inline suggestions)
- `--api` flag in `bin/qcoder.js`
- `context-manager` unit tests requiring model stub
- Agent chain: multi-agent task decomposition
