import { loadMemory, clearMemory } from '../../features/memory.js'
import * as renderer from '../renderer.js'

export default async function memory(parsed, context) {
  if (!context.projectPath) { renderer.warn('no project set'); return }

  if (parsed.sub === 'show') {
    const mem = loadMemory(context.projectPath)
    if (!mem) { renderer.muted('  memory is empty'); return }
    renderer.header('PROJECT MEMORY')
    renderer.muted(mem)
    return
  }

  if (parsed.sub === 'clear') {
    clearMemory(context.projectPath)
    renderer.success('  memory cleared')
    return
  }

  renderer.error('usage: memory show | memory clear')
}
