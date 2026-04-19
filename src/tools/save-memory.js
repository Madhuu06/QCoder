import { appendMemory } from '../features/memory.js'

export function saveMemory({ fact, projectPath }) {
  if (!fact || !fact.trim()) return { error: 'fact cannot be empty' }
  const result = appendMemory(projectPath, fact.trim())
  return result  // 'saved' or 'already known'
}
