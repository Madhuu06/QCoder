import { runQueue }  from '../../features/queue-runner.js'
import { runTask }   from '../../agent/runner.js'
import * as renderer from '../renderer.js'

export default async function queue(parsed, context) {
  const { sub, args, db } = { ...parsed, db: context.db }
  if (!db) { renderer.warn('no project open'); return }

  const sid = context.sessionId

  if (sub === 'add') {
    const task = args[0]
    if (!task) { renderer.error('usage: queue add "<task>"'); return }
    const maxPos = db.prepare(
      'SELECT MAX(position) as m FROM task_queue WHERE session_id = ?'
    ).get(sid)?.m ?? 0
    db.prepare(
      'INSERT INTO task_queue (session_id, task, status, position) VALUES (?,?,?,?)'
    ).run(sid, task, 'pending', maxPos + 1)
    renderer.success(`  queued at position ${maxPos + 1}`)
    return
  }

  if (sub === 'list') {
    const rows = db.prepare(
      'SELECT * FROM task_queue WHERE session_id = ? ORDER BY position ASC'
    ).all(sid)
    if (!rows.length) { renderer.muted('  queue is empty'); return }
    renderer.header('TASK QUEUE')
    renderer.table([
      ['Pos', 'Status', 'Task'],
      ...rows.map(r => [String(r.position), r.status, r.task]),
    ])
    return
  }

  if (sub === 'run') {
    const trustLevel = db.prepare('SELECT trust_level FROM sessions WHERE id = ?').get(sid)?.trust_level ?? 'medium'
    await runQueue(sid, db, (task, opts) => runTask(task, {
      ...opts,
      sessionId:   sid,
      projectPath: context.projectPath,
    }), trustLevel)
    return
  }

  if (sub === 'remove') {
    const pos = parseInt(args[0])
    db.prepare("DELETE FROM task_queue WHERE session_id = ? AND position = ? AND status = 'pending'").run(sid, pos)
    renderer.success(`  removed position ${pos}`)
    return
  }

  if (sub === 'move') {
    const [id, newPos] = [parseInt(args[0]), parseInt(args[1])]
    db.prepare('UPDATE task_queue SET position = ? WHERE id = ? AND session_id = ?').run(newPos, id, sid)
    renderer.success(`  moved to position ${newPos}`)
    return
  }

  if (sub === 'resume') {
    // Set the most recent failed task back to pending
    db.prepare("UPDATE task_queue SET status = 'pending' WHERE session_id = ? AND status = 'failed'").run(sid)
    renderer.muted('  resuming queue...')
    const trustLevel = db.prepare('SELECT trust_level FROM sessions WHERE id = ?').get(sid)?.trust_level ?? 'medium'
    await runQueue(sid, db, (task, opts) => runTask(task, {
      ...opts, sessionId: sid, projectPath: context.projectPath,
    }), trustLevel)
    return
  }

  if (sub === 'clear') {
    db.prepare("DELETE FROM task_queue WHERE session_id = ? AND status = 'pending'").run(sid)
    renderer.success('  queue cleared')
    return
  }

  renderer.error('usage: queue add|list|run|resume|remove|move|clear')
}
