import { listModels }    from '../../ollama/client.js'
import { scanAndSave }   from '../../ollama/models.js'
import { setConfig, getConfig } from '../../db/index.js'
import * as renderer     from '../renderer.js'

export default async function model(parsed, context) {
  const sub = parsed.sub

  if (sub === 'list') {
    const models = await listModels()
    if (!models.length) { renderer.muted('  no models installed'); return }
    renderer.header('INSTALLED MODELS')
    renderer.table(models.map(m => [m.name, m.size ? `${(m.size / 1e9).toFixed(1)}GB` : '']))
    return
  }

  if (sub === 'use') {
    const name = parsed.args[0]
    if (!name) { renderer.error('usage: model use <model-name>'); return }
    setConfig('recommended_model', name)
    if (context.sessionId && context.db) {
      context.db.prepare('UPDATE sessions SET model = ? WHERE id = ?').run(name, context.sessionId)
    }
    renderer.success(`  model set to ${name}`)
    return
  }

  if (sub === 'scan') {
    renderer.muted('  scanning system...')
    const result = scanAndSave()
    renderer.success(`  RAM: ${result.totalRamGb}GB  GPU: ${result.hasGpu}  → recommended: ${result.recommendedModel}`)
    return
  }

  if (sub === 'current') {
    const current = getConfig('recommended_model') ?? context.config?.defaultModel ?? 'not set'
    renderer.muted(`  current model: ${current}`)
    return
  }

  renderer.error('usage: model list | model use <name> | model scan | model current')
}
