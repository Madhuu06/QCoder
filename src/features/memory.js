import fs   from 'fs'
import path from 'path'

const MEMORY_FILENAME = 'memory.md'

/**
 * Reads the project memory file.
 * Returns empty string if the file doesn't exist yet.
 */
export function loadMemory(projectPath) {
  const memPath = path.join(projectPath, '.qcoder', MEMORY_FILENAME)
  if (!fs.existsSync(memPath)) return ''
  return fs.readFileSync(memPath, 'utf8').trim()
}

/**
 * Appends a fact to the memory file.
 * Skips if the exact fact string is already present.
 */
export function appendMemory(projectPath, fact) {
  const memPath = path.join(projectPath, '.qcoder', MEMORY_FILENAME)
  const existing = fs.existsSync(memPath) ? fs.readFileSync(memPath, 'utf8') : ''

  if (existing.includes(fact)) return 'already known'

  const updated = existing.trim()
    ? `${existing.trim()}\n- ${fact}`
    : `- ${fact}`
  fs.writeFileSync(memPath, updated + '\n')
  return 'saved'
}

/**
 * Clears the memory file completely.
 */
export function clearMemory(projectPath) {
  const memPath = path.join(projectPath, '.qcoder', MEMORY_FILENAME)
  if (fs.existsSync(memPath)) fs.unlinkSync(memPath)
}
