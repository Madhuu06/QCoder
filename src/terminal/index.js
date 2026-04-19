import { openDb, getConfig } from '../db/index.js'
import { watchProject }      from '../rag/watcher.js'
import { readLine }          from './input.js'
import { parseCommand }      from './command-parser.js'
import { route }             from './commands/router.js'
import * as renderer          from './renderer.js'

/**
 * Starts the QCoder REPL.
 * Thin router — no command logic lives here.
 */
export async function startTerminal(config) {
  // ─── Bootstrap context ────────────────────────────────────────────────────
  const context = {
    db:          null,
    config,
    sessionId:   null,
    projectPath: config.lastProjectPath ?? null,
    watcher:     null,
  }

  if (config.lastProjectPath) {
    context.db      = openDb(config.lastProjectPath)
    context.watcher = watchProject(config.lastProjectPath, context.db)

    // Load most recently active session, or create a default one
    const existing = context.db.prepare(
      'SELECT * FROM sessions WHERE project_path = ? ORDER BY last_active DESC LIMIT 1'
    ).get(config.lastProjectPath)

    if (existing) {
      context.sessionId = existing.id
    } else {
      const model  = getConfig('recommended_model') ?? config.defaultModel ?? 'qwen2.5-coder:7b'
      const result = context.db.prepare(
        'INSERT INTO sessions (name, model, project_path, trust_level, created_at, last_active) VALUES (?,?,?,?,?,?)'
      ).run('default', model, config.lastProjectPath, config.defaultTrustLevel ?? 'medium', Date.now(), Date.now())
      context.sessionId = result.lastInsertRowid
    }
  } else {
    renderer.warn("  No project set. Run: project set <path>")
  }

  renderer.muted("  type 'help' for commands")

  // ─── Main REPL loop ───────────────────────────────────────────────────────
  while (true) {
    const raw = await readLine()
    if (!raw.trim()) continue

    const parsed = parseCommand(raw)
    if (!parsed) continue

    await route(parsed, context)
  }
}
