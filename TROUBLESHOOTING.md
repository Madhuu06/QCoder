# QCoder — Troubleshooting & FAQ

## Quick fixes

### "Ollama not running"
```bash
ollama serve
```
Ollama must be running before you start `qcoder`.

---

### "nomic-embed-text not found"
```bash
ollama pull nomic-embed-text
```
This model is required for RAG indexing. Without it, context retrieval is disabled and the health check will fail.

---

### "Model not found — run: ollama pull qwen2.5-coder:7b"
```bash
ollama pull qwen2.5-coder:7b
```
Or switch to a smaller model if you're low on RAM:
```bash
ollama pull qwen2.5-coder:3b
```
Then inside QCoder:
```
qcoder > model use qwen2.5-coder:3b
```

---

### "only X GB free, need Y GB"
Close memory-heavy apps (browsers, IDEs) or switch to a smaller model:
```
qcoder > model use qwen2.5-coder:3b
```
Use `model scan` to re-check system specs after closing apps.

---

### "No project set"
```
qcoder > project set /path/to/your/project
```

---

### Agent loops or gets stuck
- Check `max_steps` in `system_config` (default 15) — it hard-stops after that.
- Use `trust medium` if running in `high` — confirmation pauses sometimes help.
- Use `--dry` first to preview what the agent plans to do.

---

### `undo` says "nothing to undo"
Undo only covers changes made **in the current session**. If you switched sessions, switch back first:
```
qcoder > session list
qcoder > session switch <id>
qcoder > undo
```

---

### Index search returns no results
Either:
1. The project hasn't been indexed yet — run `index build`
2. The similarity threshold is too high — lower it:
   ```sql
   UPDATE system_config SET value = '0.35' WHERE key = 'rag_similarity_threshold';
   ```
3. The embedding model is returning different-dimension vectors — try `index rebuild`

---

### `better-sqlite3` build errors on Windows
You need the Visual Studio C++ build tools. Alternatively, install the prebuilt binary:
```bash
cd node_modules/better-sqlite3
npx prebuild-install --runtime node --tag-prefix v
```

---

### QCoder responds with plain text instead of tool calls
The model occasionally breaks format. The response parser retries up to 3 times automatically. If it still fails:
1. Try a larger model: `model use qwen2.5-coder:14b`
2. Check if the system prompt is being injected (`renderer.js` debug mode coming in v0.2)
3. The `qwen2.5-coder` family follows JSON formatting better than most — other models may need prompt tuning

---

### Command not recognised / tab autocomplete missing
Make sure you're in the QCoder REPL (you'll see `qcoder >`). Some terminals intercept tab — try Windows Terminal or VS Code's integrated terminal.

---

## Reporting bugs

Include:
1. Your Node.js version (`node --version`)
2. Your OS
3. Ollama version (`ollama --version`)
4. The model you're using
5. The exact command that failed
6. Any error output from the terminal
