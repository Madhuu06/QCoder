# Changelog

All notable changes to QCoder will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [0.1.1] — 2026-04-29

### Agent quality

- **`temperature: 0.1` + `format: 'json'`** — Ollama now returns structurally valid JSON on every call; near-deterministic code output (`src/ollama/client.js`)
- **`repeat_penalty: 1.1` + `num_ctx: 8192`** — prevents repetitive output; explicit context window so Ollama doesn't silently use a smaller default
- **Few-shot examples in system prompt** — two complete worked examples of correct tool call sequences injected into every prompt; biggest single improvement for small model reliability
- **Negative examples in system prompt** — explicit WRONG vs CORRECT format blocks; small models follow negative examples very well
- **Single-write enforcement** — system prompt now explicitly states "write each file ONCE with complete final content — do NOT write then rewrite"
- **Write tracker** — runner.js tracks which files were written this task; if model writes the same file twice, second write is allowed with a spinner label update (never blocks — blocking causes agent confusion)
- **Silent planning** — planner collects the plan without streaming to terminal; displays only the clean numbered steps; eliminates `\`\`\`bash` blocks and "Please provide output" noise
- **Suppressed step streaming** — tool call steps run silently with a spinner instead of flooding the terminal with `[step N/15]`, `→ tool(args)`, `✓ result`
- **`bye` / `exit` / `quit`** — clean shutdown commands with proper watcher/DB close

### Bugs fixed

- **Health check model name matching** — `nomic-embed-text:latest` now correctly matches `nomic-embed-text`; `:latest` suffix normalised for all model checks
- **`write_file` trust level** — reclassified from `destructive` to `write`; medium trust no longer asks for confirmation on every file write (only `run_cmd` requires it)
- **Tool description: single-write** — `write_file` and `create_file` descriptions now explicitly say "in ONE call — never call this multiple times for the same file"
- **`session new [name]`** — optional name argument now implemented; defaults to `session-{id}`
- **`queue move`** — added to README command table
- **`history`** — added to README command table

### RAG improvements

- **Query expansion** — short queries (≤8 words) are expanded with related technical keywords before embedding; better recall for vague queries like "fix login bug"
- **Reranker** — after cosine similarity, chunks are rescored: `+0.15` if file was touched this session, `+0.10` if modified in the last hour
- **Import graph injection** — each injected chunk now includes `[This file imports: x, y, z]` extracted cheaply with regex; model understands dependencies without reading every file
- **Similarity threshold** — lowered from `0.5` to `0.4` to reduce missed relevant chunks

### Language support

- **Chunker extended** — `.go`, `.rs`, `.java`, `.c`, `.cpp`, `.cs`, `.yaml`, `.toml` now use line-based chunking; binary/unknown extensions are skipped cleanly

### Documentation

- Installation section now shows `npm install -g qcoder` as primary path; `git clone` moved to developer path
- Fixed RAG description: "SQLite with cosine similarity search" not "vector database"
- Added `.gitignore` snippet to Project Files section
- Added note that `memory.md` is hand-editable
- Removed `qwen2.5-coder:32b` from hardware table (not in recommendation logic)
- Removed `deepseek-coder-v2:16b` from supported models table (not in models.js)
- `rag_similarity_threshold` default updated to `0.4` in config table
- Added `CONTRIBUTING.md` — project structure, rules, tool adding guide, commit style
- Added `LICENSE` — MIT, Copyright 2026 QCoder Contributors
- Fixed `CONTRIBUTING.md` clone URL from placeholder to actual GitHub repo

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
