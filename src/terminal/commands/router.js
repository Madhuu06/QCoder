import * as renderer from '../renderer.js'
import ask        from './ask.js'
import fix        from './fix.js'
import explain    from './explain.js'
import model      from './model.js'
import session    from './session.js'
import queue      from './queue.js'
import memory     from './memory.js'
import rag        from './index.js'
import project    from './project.js'
import errors     from './errors.js'
import undo       from './undo.js'
import trust      from './trust.js'
import help       from './help.js'
import modelCache from './model-cache.js'

const ROUTES = {
  ask, fix, explain, model, session, queue,
  memory, index: rag, project, errors, undo, trust, help,
  sleep: modelCache,
  wake:  modelCache,
}

/**
 * Routes a parsed command to the correct handler.
 * context: { db, config, sessionId, projectPath, watcher }
 */
export async function route(parsed, context) {
  const handler = ROUTES[parsed.cmd]
  if (!handler) {
    renderer.error(`unknown command: ${parsed.cmd}. type 'help' for a list`)
    return
  }
  try {
    await handler(parsed, context)
  } catch (err) {
    renderer.error(`error: ${err.message}`)
  }
}
