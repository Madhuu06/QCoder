import fs   from 'fs'
import path from 'path'
import { shouldIgnore } from '../ignore.js'

export function createFile({ path: filePath, content, projectPath, ignorePatterns, rollbackManager }) {
  if (shouldIgnore(filePath, projectPath, ignorePatterns)) {
    return { error: `${filePath} is in a protected location` }
  }
  try {
    // Create parent directories if needed
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    // Backup if already exists (overwrite scenario)
    if (fs.existsSync(filePath)) rollbackManager.backup(filePath)
    fs.writeFileSync(filePath, content ?? '', 'utf8')
    return `created ${filePath}`
  } catch (err) {
    return { error: err.message }
  }
}
