import fs   from 'fs'
import { shouldIgnore } from '../ignore.js'

export function readFile({ path: filePath, projectPath, ignorePatterns }) {
  if (shouldIgnore(filePath, projectPath, ignorePatterns)) {
    return { error: `${filePath} is protected and cannot be read` }
  }
  if (!fs.existsSync(filePath)) {
    return { error: `file not found: ${filePath}` }
  }
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch (err) {
    return { error: err.message }
  }
}
