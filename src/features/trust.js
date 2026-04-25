/**
 * Operation risk classifications.
 */
const OPERATION_RISK = {
  read_file:   'read',
  list_files:  'read',
  save_memory: 'write',
  create_file: 'write',
  write_file:  'write',        // medium trust auto-approves — undo is always available
  run_cmd:     'destructive',  // only run_cmd requires confirmation at medium trust
  delete_file: 'always_confirm',
}

/**
 * What each trust level auto-approves vs requires confirmation for.
 */
const TRUST_RULES = {
  low:    { read: 'confirm', write: 'confirm',  destructive: 'confirm' },
  medium: { read: 'auto',    write: 'auto',      destructive: 'confirm' },
  high:   { read: 'auto',    write: 'auto',      destructive: 'auto'    },
}

/**
 * Decides whether to auto-approve or ask the user for a given tool call.
 * @param {string}   toolName   - Name of the tool about to execute
 * @param {object}   args       - Tool arguments (for display)
 * @param {string}   trustLevel - 'low' | 'medium' | 'high'
 * @param {function} askUser    - async fn(question) => boolean
 * @returns {Promise<boolean>}  - true = proceed, false = rejected
 */
export async function permissionGate(toolName, args, trustLevel, askUser) {
  // delete_file always asks, regardless of trust level
  if (toolName === 'delete_file') {
    return await askUser(`permanently delete ${args.path ?? '?'}? this cannot be undone`)
  }

  const risk  = OPERATION_RISK[toolName] ?? 'destructive'
  const rules = TRUST_RULES[trustLevel]  ?? TRUST_RULES.medium
  const rule  = rules[risk]

  if (rule === 'auto') return true

  const desc = formatDescription(toolName, args)
  return await askUser(desc)
}

function formatDescription(toolName, args) {
  switch (toolName) {
    case 'write_file':  return `overwrite ${args.path} (${String(args.content ?? '').split('\n').length} lines)`
    case 'create_file': return `create ${args.path}`
    case 'run_cmd':     return `run: ${args.command}`
    case 'save_memory': return `save to memory: "${args.fact}"`
    default:            return `${toolName}(${JSON.stringify(args)})`
  }
}
