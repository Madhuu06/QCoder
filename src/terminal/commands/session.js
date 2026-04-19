import { getConfig } from '../../db/index.js'
import * as renderer  from '../renderer.js'

export default async function session(parsed, context) {
  const { sub, args, db } = { ...parsed, db: context.db }
  if (!db) { renderer.warn('no project open — run: project set <path>'); return }

  if (sub === 'new') {
    const model = getConfig('recommended_model') ?? 'qwen2.5-coder:7b'
    const trust = getConfig('default_trust_level') ?? 'medium'
    const result = db.prepare(
      'INSERT INTO sessions (name, model, project_path, trust_level, created_at, last_active) VALUES (?,?,?,?,?,?)'
    ).run(args[0] ?? 'session', model, context.projectPath, trust, Date.now(), Date.now())
    context.sessionId = result.lastInsertRowid
    renderer.success(`  new session #${context.sessionId} created`)
    return
  }

  if (sub === 'list') {
    const rows = db.prepare(
      'SELECT id, name, model, trust_level, last_active FROM sessions WHERE project_path = ? ORDER BY last_active DESC'
    ).all(context.projectPath)
    if (!rows.length) { renderer.muted('  no sessions yet'); return }
    renderer.header('SESSIONS')
    renderer.table(
      [['ID', 'Name', 'Model', 'Trust', 'Last active'],
       ...rows.map(r => [
         String(r.id), r.name, r.model, r.trust_level,
         new Date(r.last_active).toLocaleString(),
       ])]
    )
    return
  }

  if (sub === 'switch') {
    const id = parseInt(args[0])
    if (!id) { renderer.error('usage: session switch <id>'); return }
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id)
    if (!row) { renderer.error(`session ${id} not found`); return }
    context.sessionId = id
    if (row.summary) renderer.muted(`  [context] ${row.summary}`)
    renderer.success(`  switched to session #${id} (${row.name})`)
    return
  }

  if (sub === 'rename') {
    const [id, name] = [parseInt(args[0]), args[1]]
    if (!id || !name) { renderer.error('usage: session rename <id> <name>'); return }
    db.prepare('UPDATE sessions SET name = ? WHERE id = ?').run(name, id)
    renderer.success(`  session ${id} renamed to "${name}"`)
    return
  }

  renderer.error('usage: session new | list | switch <id> | rename <id> <name>')
}
