import { runTask }  from '../../agent/runner.js'
import * as renderer from '../renderer.js'

export default async function fix(parsed, context) {
  const errorDesc = parsed.args[0]
  if (!errorDesc) { renderer.error('usage: fix "<error description>"'); return }
  if (!context.projectPath) { renderer.warn('no project set — run: project set <path>'); return }

  const task       = `Examine the project and fix this error: ${errorDesc}`
  const trustLevel = context.db
    ?.prepare('SELECT trust_level FROM sessions WHERE id = ?')
    .get(context.sessionId)?.trust_level ?? 'medium'

  await runTask(task, {
    sessionId:   context.sessionId,
    trustLevel,
    projectPath: context.projectPath,
  })
}
