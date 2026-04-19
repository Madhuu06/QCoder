import { setConfig } from '../../db/index.js'
import { updateConfig } from '../../config.js'
import * as renderer from '../renderer.js'

const LEVELS = new Set(['low', 'medium', 'high'])

export default async function trust(parsed, context) {
  const level = parsed.sub
  if (!level || !LEVELS.has(level)) {
    renderer.error('usage: trust low | trust medium | trust high')
    return
  }

  // Update system_config + current session
  setConfig('default_trust_level', level)
  if (context.sessionId && context.db) {
    context.db.prepare('UPDATE sessions SET trust_level = ? WHERE id = ?').run(level, context.sessionId)
  }
  updateConfig('defaultTrustLevel', level)

  renderer.success(`  trust level set to ${level}`)

  const desc = {
    low:    'Every action requires confirmation',
    medium: 'Reads are automatic, writes/commands require confirmation',
    high:   'Fully autonomous — only pauses on unresolvable errors',
  }[level]
  renderer.muted(`  ${desc}`)
}
