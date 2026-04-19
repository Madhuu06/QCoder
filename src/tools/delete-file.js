import fs from 'fs'
import { shouldIgnore } from '../ignore.js'

/**
 * delete_file — always requires confirmation (enforced by permissionGate, not here).
 * Always backs up before deleting so undo works.
 */
export function deleteFile({ path: filePath, projectPath, ignorePatterns, rollbackManager }) {
  if (shouldIgnore(filePath, projectPath, ignorePatterns)) {
    return { error: `${filePath} is protected and cannot be deleted` }
  }
  if (!fs.existsSync(filePath)) {
    return { error: `file not found: ${filePath}` }
  }
  try {
    rollbackManager.backup(filePath)   // backup so undo can restore
    fs.unlinkSync(filePath)
    return `deleted ${filePath}`
  } catch (err) {
    return { error: err.message }
  }
}
