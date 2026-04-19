import fs   from 'fs'
import path  from 'path'
import { updateConfig }     from '../../config.js'
import { openDb, getConfig } from '../../db/index.js'
import { watchProject }     from '../../rag/watcher.js'
import * as renderer         from '../renderer.js'

export default async function project(parsed, context) {
  if (parsed.sub === 'set') {
    const newPath = parsed.args[0]
    if (!newPath) { renderer.error('usage: project set <path>'); return }

    const resolved = path.resolve(newPath)
    if (!fs.existsSync(resolved)) { renderer.error(`path not found: ${resolved}`); return }

    // Close old watcher and DB
    if (context.watcher) context.watcher.close()
    if (context.db)      context.db.close()

    // Open new DB + watcher
    context.projectPath = resolved
    context.db = openDb(resolved)
    context.watcher = watchProject(resolved, context.db)

    // Create a default session
    const model  = getConfig('recommended_model') ?? 'qwen2.5-coder:7b'
    const result = context.db.prepare(
      'INSERT INTO sessions (name, model, project_path, trust_level, created_at, last_active) VALUES (?,?,?,?,?,?)'
    ).run('default', model, resolved, 'medium', Date.now(), Date.now())
    context.sessionId = result.lastInsertRowid

    updateConfig('lastProjectPath', resolved)
    renderer.success(`  project set: ${resolved}`)
    renderer.muted(`  session #${context.sessionId} created — run 'index build' to index the project`)
    return
  }

  if (parsed.sub === 'status') {
    if (!context.projectPath) { renderer.warn('no project set'); return }
    const meta = context.db?.prepare('SELECT * FROM rag_meta WHERE project_path = ?').get(context.projectPath)
    renderer.header('PROJECT STATUS')
    renderer.table([
      ['Path',       context.projectPath],
      ['Session',    String(context.sessionId ?? 'none')],
      ['Indexed',    meta ? `${meta.chunk_count} chunks` : 'not indexed'],
      ['Last index', meta ? new Date(meta.last_indexed).toLocaleString() : '—'],
    ])
    return
  }

  renderer.error('usage: project set <path> | project status')
}
