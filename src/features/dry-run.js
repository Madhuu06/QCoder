import * as renderer from '../terminal/renderer.js'

/**
 * Creates a dry-run version of the tool handlers.
 * Read operations execute normally (needed for accurate planning).
 * Write/delete/command operations are logged but not executed.
 */
export function createDryRunTools(realTools) {
  const log = []

  const dryTools = {}
  for (const [name, fn] of Object.entries(realTools)) {
    const isReadOnly = name === 'read_file' || name === 'list_files'

    dryTools[name] = async (args) => {
      if (isReadOnly) {
        // Execute reads normally for accurate planning
        return fn(args)
      }
      // Log the would-be action
      const desc = describeAction(name, args)
      log.push({ tool: name, args, description: desc })
      renderer.muted(`  [dry-run] ${desc}`)
      return `[dry-run] would ${desc}`
    }
  }

  return { dryTools, getLog: () => log }
}

function describeAction(name, args) {
  switch (name) {
    case 'write_file':  return `overwrite ${args.path}`
    case 'create_file': return `create ${args.path}`
    case 'delete_file': return `delete ${args.path}`
    case 'run_cmd':     return `run: ${args.command}`
    case 'save_memory': return `save to memory: "${args.fact}"`
    default:            return `${name}(${JSON.stringify(args)})`
  }
}
