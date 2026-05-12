import { prewarmModel, releaseModel } from '../../ollama/prewarmer.js'
import { getConfig }                  from '../../db/index.js'
import * as renderer                  from '../renderer.js'

/**
 * sleep — releases the model from RAM immediately.
 * wake  — re-warms the model back into the OS page cache.
 *
 * Usage:
 *   qcoder > sleep        ← free RAM, model unloads from Ollama
 *   qcoder > wake         ← reload model into page cache silently
 */
export default async function modelCache(parsed, context) {
  const model = getConfig('recommended_model') ?? 'qwen2.5-coder:7b'

  if (parsed.cmd === 'sleep') {
    renderer.muted('  Releasing model from RAM...')
    await releaseModel(model)
    renderer.success('  Model unloaded. RAM freed. Run wake to reload.')
    return
  }

  if (parsed.cmd === 'wake') {
    renderer.muted(`  Warming ${model} into cache...`)
    await prewarmModel(model)
    renderer.success('  Model warm. First token will arrive fast.')
    return
  }
}
