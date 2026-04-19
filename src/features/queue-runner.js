import * as renderer from '../terminal/renderer.js'

/**
 * Processes the task_queue table in position order for the given session.
 * Stops on the first failure — later tasks likely depend on earlier ones.
 *
 * Mid-task confirmations (from permissionGate) are just awaited normally —
 * they suspend the async loop and wait for user input without any special state.
 *
 * The 'paused' status is only written when a task FAILS between tasks,
 * allowing 'queue resume' to pick up from the failed row.
 */
export async function runQueue(sessionId, db, runTask, trustLevel) {
  const total = db.prepare(
    "SELECT COUNT(*) as c FROM task_queue WHERE session_id = ? AND status IN ('pending','failed')"
  ).get(sessionId)?.c ?? 0

  if (total === 0) {
    renderer.muted('queue is empty')
    return
  }

  let pos = 0

  while (true) {
    const task = db.prepare(`
      SELECT * FROM task_queue
      WHERE session_id = ? AND status = 'pending'
      ORDER BY position ASC LIMIT 1
    `).get(sessionId)

    if (!task) {
      renderer.success('queue complete')
      break
    }

    pos++
    renderer.header(`[${pos}/${total}] ${task.task}`)
    db.prepare("UPDATE task_queue SET status = 'running' WHERE id = ?").run(task.id)

    try {
      const result = await runTask(task.task, { sessionId, trustLevel })
      db.prepare("UPDATE task_queue SET status = 'done', result = ? WHERE id = ?")
        .run(result.summary ?? 'done', task.id)
      renderer.success(`  done`)
    } catch (err) {
      db.prepare("UPDATE task_queue SET status = 'failed', result = ? WHERE id = ?")
        .run(err.message, task.id)
      renderer.error(`  failed: ${err.message}`)
      renderer.warn("  queue stopped — fix the issue and run 'queue resume' to continue")
      break
    }
  }
}
