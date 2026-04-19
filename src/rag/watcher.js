import chokidar from 'chokidar'
import { reindexFile }                    from './indexer.js'
import { loadIgnorePatterns, shouldIgnore } from '../ignore.js'

/**
 * Watches the project for file changes and re-indexes modified files.
 * Runs silently in the background.
 * Returns the chokidar watcher instance (used by CTRL+C handler to close it).
 */
export function watchProject(projectPath, db) {
  const ignorePatterns = loadIgnorePatterns(projectPath)

  const watcher = chokidar.watch(projectPath, {
    ignored:          (filePath) => shouldIgnore(filePath, projectPath, ignorePatterns),
    persistent:       true,
    ignoreInitial:    true,
    awaitWriteFinish: { stabilityThreshold: 300 },
  })

  watcher.on('change', (filePath) => reindexFile(filePath, projectPath, db))
  watcher.on('add',    (filePath) => reindexFile(filePath, projectPath, db))
  watcher.on('unlink', (filePath) => {
    db.prepare('DELETE FROM rag_chunks WHERE file_path = ?').run(filePath)
  })

  return watcher
}
