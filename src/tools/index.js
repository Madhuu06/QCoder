import { readFile }   from './read-file.js'
import { writeFile }  from './write-file.js'
import { createFile } from './create-file.js'
import { deleteFile } from './delete-file.js'
import { listFiles }  from './list-files.js'
import { runCmd }     from './run-cmd.js'
import { saveMemory } from './save-memory.js'

/**
 * All tools exposed to the agent.
 * description strings are injected verbatim into the system prompt.
 */
export const TOOLS = [
  { name: 'read_file',   description: 'Read the contents of a file. Args: { path: string }',                                                               fn: readFile   },
  { name: 'write_file',  description: 'Overwrite a file with new content. Args: { path: string, content: string }. Write the COMPLETE final file content in ONE call — never call this multiple times for the same file.',           fn: writeFile  },
  { name: 'create_file', description: 'Create a new file with its full content. Args: { path: string, content: string }. Write ALL the content in one call — never call this multiple times for the same file.',                        fn: createFile },
  { name: 'delete_file', description: 'Permanently delete a file. Args: { path: string }. Will always ask for confirmation.',                              fn: deleteFile },
  { name: 'list_files',  description: 'List all files in the project. Args: {} — no arguments needed.',                                                    fn: listFiles  },
  { name: 'run_cmd',     description: 'Run a whitelisted terminal command. Args: { command: string }. Allowed: node, npm, npx, python, git, ls, mkdir, touch.', fn: runCmd },
  { name: 'save_memory', description: 'Save a fact about this project to permanent memory. Args: { fact: string }. Use for conventions, config, project-specific knowledge.', fn: saveMemory },
]

/**
 * The done pseudo-tool descriptor — included in system prompt tool list
 * but has no execute function. Runner detects it by name and exits the loop.
 */
export const DONE_TOOL = {
  name:        'done',
  description: 'Call this when the task is fully complete. Args: { summary: string } — one sentence describing what was done.',
}

/** Returns a name→execute map for use in runner.js */
export function buildToolHandlers({ projectPath, ignorePatterns, rollbackManager, db, timeoutMs }) {
  return {
    read_file:   (args) => readFile({ ...args, projectPath, ignorePatterns }),
    write_file:  (args) => writeFile({ ...args, projectPath, ignorePatterns, rollbackManager }),
    create_file: (args) => createFile({ ...args, projectPath, ignorePatterns, rollbackManager }),
    delete_file: (args) => deleteFile({ ...args, projectPath, ignorePatterns, rollbackManager }),
    list_files:  (args) => listFiles({ ...args, projectPath, ignorePatterns }),
    run_cmd:     (args) => runCmd({ ...args, timeoutMs }),
    save_memory: (args) => saveMemory({ ...args, projectPath }),
  }
}
