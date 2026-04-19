import fs   from 'fs'
import { shouldIgnore } from '../ignore.js'

export function writeFile({ path: filePath, content, projectPath, ignorePatterns, rollbackManager }) {
  if (shouldIgnore(filePath, projectPath, ignorePatterns)) {
    return { error: `${filePath} is protected and cannot be written` }
  }
  try {
    rollbackManager.backup(filePath)
    fs.writeFileSync(filePath, content, 'utf8')
    return `wrote ${String(content).split('\n').length} lines to ${filePath}`
  } catch (err) {
    return { error: err.message }
  }
}
