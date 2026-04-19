# Contributing to QCoder

Thanks for taking the time to contribute. QCoder is a local-first project — contributions that keep it fast, safe, and dependency-light are most welcome.

---

## Getting Started

```bash
git clone <repo-url> qcoder
cd qcoder
npm install
npm test   # all unit tests should pass before making changes
```

---

## Project Structure

```
src/
├── agent/        # Core loop: runner, planner, context manager, response parser
├── tools/        # Tool implementations (read, write, create, delete, run, memory)
├── prompts/      # Exact prompt text for all 4 prompt types
├── rag/          # RAG pipeline: chunker, embedder, indexer, retriever, watcher
├── ollama/       # Ollama API client and model recommendation
├── features/     # Safety: trust, rollback, dry-run, error fingerprinting
├── terminal/     # CLI: renderer, input, command parser, all command handlers
├── db/           # SQLite schema and database opener
├── config.js     # Global ~/.qcoder/config.json
└── ignore.js     # Ignore patterns with hardcoded security floor

test/
├── tools/        # Unit tests per tool
├── agent/        # Response parser + context manager tests
├── prompts/      # System prompt assembly tests
├── features/     # Rollback + error fingerprint tests
├── rag/          # Chunker + cosine similarity tests
├── scenarios/    # End-to-end tests (require Ollama)
└── helpers/      # createTestProject() helper
```

---

## What to Work On

### Good first issues
- Add a new command handler in `src/terminal/commands/`
- Add test cases to an existing test file
- Improve error messages in any tool
- Add support for a new file extension in the RAG chunker

### Bigger contributions
- New tool (must follow the backup-before-write pattern)
- Improved context window algorithm
- VS Code extension layer (planned for v0.2)

---

## Rules

### Safety is non-negotiable
- `delete_file` **must** always confirm regardless of trust level. Do not change `permissionGate`.
- Every write and delete **must** call `rollbackManager.backup()` before touching the filesystem.
- The `ALWAYS_IGNORE` list in `src/ignore.js` is a security floor — never shrink it.

### No new dependencies without discussion
QCoder is intentionally lean. If you want to add a dependency, open an issue first and explain why an existing module can't solve the problem.

### Prompts are code
The text in `src/prompts/` directly determines agent quality. Changes to prompt wording should be tested against real Ollama runs, not just syntax-checked.

### ESM only
All source files use ES modules (`import`/`export`). No `require()`. No CommonJS.

---

## Adding a New Tool

1. Create `src/tools/<tool-name>.js` — export a named function.
2. Add the tool descriptor to `TOOLS` array in `src/tools/index.js` with an accurate `description` string (this is what the model reads).
3. Add the tool to `buildToolHandlers()` in `src/tools/index.js`.
4. Add the tool name to `KNOWN_TOOLS` in `src/agent/response-parser.js`.
5. Add a risk level to `OPERATION_RISK` in `src/features/trust.js`.
6. Write unit tests in `test/tools/<tool-name>.test.js`.

---

## Running Tests

```bash
# All unit tests
npm test

# Single file
node --test test/tools/read-file.test.js

# End-to-end (requires Ollama + models)
node test/scenarios/fix-syntax-error.js
```

All unit tests must pass before opening a PR. End-to-end scenarios are optional in CI but should be verified locally.

---

## Commit Style

Use conventional commits:

```
feat: add history command
fix: response-parser regex greedy match
test: add rollback undoAll edge case
docs: update trust level table in README
refactor: extract buildMessages() from runner
```

---

## Questions

Open a GitHub issue with the `question` label.
