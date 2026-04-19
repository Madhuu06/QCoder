import * as ollama          from '../ollama/client.js'
import * as renderer         from '../terminal/renderer.js'
import * as responseParser   from './response-parser.js'
import { plan }              from './planner.js'
import { buildContextWindow, assembleMessages } from './context-manager.js'
import { buildSystemPrompt } from '../prompts/system.js'
import { buildToolResultPrompt } from '../prompts/tool-result.js'
import { buildErrorPrompt }      from '../prompts/error-recovery.js'
import { buildPromptWithContext } from '../rag/inject.js'
import { loadMemory }            from '../features/memory.js'
import { permissionGate }        from '../features/trust.js'
import { RollbackManager }       from '../features/rollback.js'
import { checkKnownError }       from '../features/error-fingerprint.js'
import { TOOLS, buildToolHandlers } from '../tools/index.js'
import { loadIgnorePatterns }    from '../ignore.js'
import { getConfig, getDb }      from '../db/index.js'

/**
 * Runs the agent loop for a single task.
 *
 * @param {string} task          - The user's task description
 * @param {object} options
 *   @param {number}   sessionId   - Active session ID
 *   @param {string}   trustLevel  - 'low' | 'medium' | 'high'
 *   @param {string}   projectPath - Absolute path to the project
 *   @param {function} onToken     - Streaming token callback (default: renderer.token)
 *   @param {function} askUser     - Confirmation callback (default: confirm.askYesNo)
 *   @param {boolean}  dryRun      - Whether to use dry-run tools
 *
 * @returns {Promise<{ success: boolean, summary: string }>}
 */
export async function runTask(task, options = {}) {
  const db = getDb()
  if (!db) throw new Error('No database open. Run: project set <path>')

  const {
    sessionId,
    projectPath,
    onToken  = renderer.token,
    askUser,
    dryRun   = false,
  } = options

  // Resolve session settings
  const session    = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)
  const model      = session?.model ?? getConfig('recommended_model') ?? 'qwen2.5-coder:7b'
  const trustLevel = options.trustLevel ?? session?.trust_level ?? getConfig('default_trust_level') ?? 'medium'
  const maxSteps   = parseInt(getConfig('max_steps') ?? '15')
  const timeoutMs  = parseInt(getConfig('run_cmd_timeout_ms') ?? '30000')

  // Load memory + build system prompt
  const memory     = loadMemory(projectPath)
  const systemPrompt = buildSystemPrompt({ memory, tools: TOOLS, trustLevel })

  // RAG context injection
  const enrichedTask = await buildPromptWithContext(task, projectPath, db, memory)

  // Context window management
  const { recent, summary } = await buildContextWindow(sessionId, db, model)

  // Get a plan before starting the loop
  const planText = await plan(enrichedTask, { model, onToken })

  // Build tools
  const ignorePatterns = loadIgnorePatterns(projectPath)
  const rollbackManager = new RollbackManager(projectPath, sessionId, db)
  const toolHandlers = buildToolHandlers({ projectPath, ignorePatterns, rollbackManager, db, timeoutMs })

  if (dryRun) {
    const { createDryRunTools } = await import('../features/dry-run.js')
    const { dryTools, getLog }  = createDryRunTools(toolHandlers)
    // Run with dry tools but don't persist messages
    await _loop({ task, enrichedTask, systemPrompt, summary, recent, model,
      planText, toolHandlers: dryTools, sessionId, db, trustLevel, maxSteps,
      askUser, onToken, persist: false })
    renderer.divider()
    renderer.muted('  [dry-run] nothing was changed')
    return { success: true, summary: 'dry run complete' }
  }

  // Save user task to history
  _saveMessage(db, sessionId, 'user', task)

  return _loop({ task, enrichedTask, systemPrompt, summary, recent, model,
    planText, toolHandlers, sessionId, db, trustLevel, maxSteps,
    askUser, onToken, persist: true })
}

async function _loop({ task, enrichedTask, systemPrompt, summary, recent, model,
  planText, toolHandlers, sessionId, db, trustLevel, maxSteps,
  askUser, onToken, persist }) {

  // Assemble initial messages from context window
  const messages = assembleMessages(systemPrompt, summary, recent)
  messages.push({ role: 'user',      content: enrichedTask })
  messages.push({ role: 'assistant', content: planText })

  let parseRetries = 0

  for (let step = 1; step <= maxSteps; step++) {
    renderer.muted(`\n  [step ${step}/${maxSteps}]`)

    // Call model
    const rawResponse = await ollama.chat(model, messages, onToken)
    renderer.token('\n')

    if (persist) _saveMessage(db, sessionId, 'assistant', rawResponse)

    // Parse response
    const parsed = responseParser.parse(rawResponse)

    if (parsed.type === 'retry') {
      parseRetries++
      if (parseRetries >= 3) {
        renderer.error('  model failed to produce valid JSON after 3 attempts')
        return { success: false, summary: 'json parse failure' }
      }
      messages.push({ role: 'assistant', content: rawResponse })
      messages.push({ role: 'user',      content: parsed.message })
      continue
    }
    parseRetries = 0

    const { tool, args } = parsed

    // done tool — exit loop
    if (tool === 'done') {
      renderer.success(`\n  ✓ ${args.summary ?? 'task complete'}`)
      if (persist) db.prepare('UPDATE sessions SET last_active = ? WHERE id = ?').run(Date.now(), sessionId)
      return { success: true, summary: args.summary ?? 'done' }
    }

    renderer.muted(`  → ${tool}(${JSON.stringify(args)})`)

    // Permission gate
    const confirmFn = askUser ?? (async (q) => {
      const { askYesNo } = await import('../terminal/confirm.js')
      return askYesNo(q)
    })
    const allowed = await permissionGate(tool, args, trustLevel, confirmFn)
    if (!allowed) {
      const denyMsg = `User rejected the ${tool} call. Choose a different approach or stop with done.`
      messages.push({ role: 'user', content: denyMsg })
      if (persist) _saveMessage(db, sessionId, 'user', denyMsg)
      continue
    }

    // Execute tool
    const handler = toolHandlers[tool]
    if (!handler) {
      const errMsg = `Unknown tool: ${tool}`
      messages.push({ role: 'user', content: errMsg })
      continue
    }

    let result
    try {
      result = await Promise.resolve(handler(args))
    } catch (err) {
      result = { error: err.message }
    }

    // Build next message
    let nextMsg
    if (result && typeof result === 'object' && result.error) {
      const knownFix = checkKnownError(db, result.error)
      nextMsg = buildErrorPrompt(tool, args, result.error, 1, 3, knownFix)
      renderer.error(`  ✗ ${result.error}`)
    } else {
      nextMsg = buildToolResultPrompt(tool, args, result, step, maxSteps)
      renderer.muted(`  ✓ done`)
    }

    messages.push({ role: 'user', content: nextMsg })
    if (persist) _saveMessage(db, sessionId, 'user', nextMsg)
  }

  renderer.warn('\n  ⚠ max steps reached — task may be incomplete')
  return { success: false, summary: 'max steps reached' }
}

function _saveMessage(db, sessionId, role, content) {
  db.prepare(
    'INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)'
  ).run(sessionId, role, content, Date.now())
}
