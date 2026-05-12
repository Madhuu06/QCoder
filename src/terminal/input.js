import termKit from 'terminal-kit'

const term = termKit.terminal

// In-memory command history (last 100 entries)
const history = []

// Full autocomplete vocabulary
const COMPLETIONS = [
  'ask', 'fix', 'explain',
  'model list', 'model use', 'model scan', 'model current',
  'session new', 'session list', 'session switch', 'session rename',
  'queue add', 'queue list', 'queue run', 'queue remove', 'queue move', 'queue resume', 'queue clear',
  'memory show', 'memory clear',
  'index build', 'index status', 'index rebuild', 'index search',
  'project set', 'project status',
  'errors list', 'errors clear',
  'history', 'undo', 'undo all',
  'trust low', 'trust medium', 'trust high',
  'sleep', 'wake',
  'help', 'bye', 'exit', 'quit',
]

/**
 * Reads a single line from the terminal.
 * Supports command history (up/down arrows) and tab autocomplete via terminal-kit's inputField.
 * Returns Promise<string>.
 */
export async function readLine() {
  term.green('\nqcoder > ')

  const response = await term.inputField({
    history,
    autoComplete:     COMPLETIONS,
    autoCompleteMenu: true,
    autoCompleteHint: false,
  }).promise

  const input = response ?? ''
  term('\n')

  if (input.trim()) {
    history.push(input)
    if (history.length > 100) history.shift()
  }

  return input
}
