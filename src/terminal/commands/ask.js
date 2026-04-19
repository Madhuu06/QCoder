import { runTask }         from '../../agent/runner.js'
import { createDryRunTools } from '../../features/dry-run.js'
import { buildToolHandlers } from '../../tools/index.js'
import { loadIgnorePatterns } from '../../ignore.js'
import { RollbackManager }    from '../../features/rollback.js'
import { getConfig }          from '../../db/index.js'
import * as renderer          from '../renderer.js'

export default async function ask(parsed, context) {
  const task = parsed.args[0]
  if (!task) { renderer.error('usage: ask "<task>"'); return }
  if (!context.projectPath) { renderer.warn('no project set — run: project set <path>'); return }
  if (!context.sessionId)   { renderer.warn('no active session'); return }

  const isDry      = parsed.flags.includes('--dry')
  const trustLevel = context.db
    ?.prepare('SELECT trust_level FROM sessions WHERE id = ?')
    .get(context.sessionId)?.trust_level ?? 'medium'

  await runTask(task, {
    sessionId:   context.sessionId,
    trustLevel,
    projectPath: context.projectPath,
    dryRun:      isDry,
  })
}
