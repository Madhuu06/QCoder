import fs   from 'fs'
import path from 'path'
import { shouldIgnore } from '../ignore.js'

export function listFiles({ projectPath, ignorePatterns }) {
  const results = []
  walk(projectPath, projectPath, ignorePatterns, results)
  return results
}

function walk(dir, projectPath, patterns, results) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (shouldIgnore(full, projectPath, patterns)) continue

    if (entry.isDirectory()) {
      walk(full, projectPath, patterns, results)
    } else {
      results.push(path.relative(projectPath, full).replace(/\\/g, '/'))
    }
  }
}
