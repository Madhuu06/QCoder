import * as renderer from '../renderer.js'

const COMMANDS = [
  ['ask "<task>"',             'Run a coding task autonomously. Add --dry to preview only.'],
  ['fix "<error>"',            'Shorthand — fix an error in the project.'],
  ['explain <file>',           'Explain what a file does in plain English.'],
  ['',                         ''],
  ['model list',               'List installed Ollama models.'],
  ['model use <name>',         'Switch to a different model.'],
  ['model scan',               'Re-detect system RAM/GPU and update recommendation.'],
  ['model current',            'Show the active model.'],
  ['',                         ''],
  ['session new [name]',       'Start a new session.'],
  ['session list',             'List all sessions for this project.'],
  ['session switch <id>',      'Switch to a different session.'],
  ['session rename <id> <n>',  'Rename a session.'],
  ['',                         ''],
  ['queue add "<task>"',       'Add a task to the queue.'],
  ['queue list',               'List queued tasks.'],
  ['queue run',                'Run all queued tasks in order.'],
  ['queue resume',             'Resume a stopped queue from the failed task.'],
  ['queue remove <pos>',       'Remove a pending task by position.'],
  ['queue clear',              'Clear all pending tasks.'],
  ['',                         ''],
  ['memory show',              'Show project memory.'],
  ['memory clear',             'Clear project memory.'],
  ['',                         ''],
  ['index build',              'Index the project for RAG context.'],
  ['index rebuild',            'Clear and rebuild the index.'],
  ['index status',             'Show index stats.'],
  ['index search "<query>"',   'Search the index manually.'],
  ['',                         ''],
  ['project set <path>',       'Set the active project directory.'],
  ['project status',           'Show current project info.'],
  ['',                         ''],
  ['errors list',              'Show learned error patterns.'],
  ['errors clear',             'Clear error pattern memory.'],
  ['',                         ''],
  ['undo',                     'Undo the last file change.'],
  ['undo all',                 'Undo all changes in this session.'],
  ['',                         ''],
  ['trust low|medium|high',    'Set the agent trust/autonomy level.'],
  ['help',                     'Show this help.'],
  ['bye / exit / quit',        'Exit QCoder cleanly.'],
]

export default async function help() {
  renderer.header('QCODER COMMANDS')
  for (const [cmd, desc] of COMMANDS) {
    if (!cmd && !desc) { renderer.muted(''); continue }
    renderer.muted(`  ${cmd.padEnd(32)} ${desc}`)
  }
  renderer.divider()
}
