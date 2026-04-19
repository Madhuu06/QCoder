import { RollbackManager } from '../../features/rollback.js'
import * as renderer        from '../renderer.js'

export default async function undo(parsed, context) {
  if (!context.projectPath || !context.sessionId) {
    renderer.warn('no active project/session')
    return
  }

  const rm = new RollbackManager(context.projectPath, context.sessionId, context.db)

  if (parsed.sub === 'all') {
    const result = rm.undoAll()
    result.ok ? renderer.success(`  ${result.msg}`) : renderer.warn(result.msg)
    return
  }

  const result = rm.undo()
  result.ok ? renderer.success(`  ${result.msg}`) : renderer.warn(result.msg)
}
