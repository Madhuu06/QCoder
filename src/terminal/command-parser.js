/**
 * Parses raw user input into a structured command object.
 * Handles quoted strings so: ask "fix the bug" → args = ['fix the bug']
 *
 * Returns { cmd, sub, args, flags } or null if input is empty.
 */
export function parseCommand(rawInput) {
  const trimmed = (rawInput ?? '').trim()
  if (!trimmed) return null

  // Tokenise: split on whitespace but keep quoted strings together
  const tokens = []
  const re     = /(?:[^\s"']+|"[^"]*"|'[^']*')+/g
  let   match
  while ((match = re.exec(trimmed)) !== null) {
    tokens.push(match[0].replace(/^['"]|['"]$/g, ''))
  }

  if (tokens.length === 0) return null

  const cmd   = tokens[0].toLowerCase()
  const rest  = tokens.slice(1)
  const flags = rest.filter(t => t.startsWith('--'))
  const args  = rest.filter(t => !t.startsWith('--'))

  // Commands with subcommands: second token is the subcommand
  const HAS_SUB = new Set([
    'model', 'session', 'queue', 'memory', 'index', 'project', 'errors', 'trust',
  ])

  if (HAS_SUB.has(cmd)) {
    const sub      = args[0] ?? null
    const subArgs  = args.slice(1)
    return { cmd, sub, args: subArgs, flags }
  }

  // undo all → cmd=undo, sub=all
  if (cmd === 'undo' && args[0] === 'all') {
    return { cmd: 'undo', sub: 'all', args: [], flags }
  }

  return { cmd, sub: null, args, flags }
}
