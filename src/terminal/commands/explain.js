import { runTask }  from '../../agent/runner.js'
import * as renderer from '../renderer.js'

export default async function explain(parsed, context) {
  const filePath = parsed.args[0]
  if (!filePath) { renderer.error('usage: explain <file>'); return }
  if (!context.projectPath) { renderer.warn('no project set — run: project set <path>'); return }

  const task = `Read ${filePath} and explain what it does in plain English, section by section.`
  const trustLevel = context.db
    ?.prepare('SELECT trust_level FROM sessions WHERE id = ?')
    .get(context.sessionId)?.trust_level ?? 'medium'

  await runTask(task, {
    sessionId:   context.sessionId,
    trustLevel,
    projectPath: context.projectPath,
  })
}
