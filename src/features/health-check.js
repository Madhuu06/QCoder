import os from 'os'
import { listModels, isRunning } from '../ollama/client.js'
import { estimateModelRam }      from '../ollama/models.js'
import { getConfig, closeDb }    from '../db/index.js'
import * as renderer             from '../terminal/renderer.js'

/**
 * Runs on every startup. Checks 5 things:
 *   1. Ollama running
 *   2. Coding model installed (exact match)
 *   3. Embedding model installed (exact match)
 *   4. Enough free RAM
 *   5. Project path configured
 *
 * Exits with code 1 if checks 1–3 fail.
 * Warns (no exit) for checks 4–5.
 */
export async function runHealthCheck(config) {
  // Register CTRL+C shutdown handler once, here
  process.on('SIGINT', () => {
    renderer.muted('\nshutting down...')
    closeDb()
    renderer.success('goodbye')
    process.exit(0)
  })

  renderer.banner('QCoder v0.1')
  renderer.header('HEALTH CHECK')

  const results = []
  let fatalFail = false

  // 1. Ollama running
  const ollamaOk = await isRunning()
  results.push({ ok: ollamaOk, label: 'Ollama', msg: ollamaOk ? 'running' : 'not running — run: ollama serve', fatal: true })
  if (!ollamaOk) { fatalFail = true; printResults(results); process.exit(1) }

  // 2 & 3. Model checks need the model list
  let installedModels = []
  try { installedModels = await listModels() } catch { /* already caught by check 1 */ }
  const names = installedModels.map(m => m.name)

  const activeModel = config.defaultModel ?? 'qwen2.5-coder:7b'
  const codingOk  = names.some(n => n === activeModel)
  results.push({
    ok: codingOk, label: 'Coding model',
    msg: codingOk ? `${activeModel} ready` : `not found — run: ollama pull ${activeModel}`,
    fatal: true,
  })
  if (!codingOk) fatalFail = true

  // Exact string match — no includes()
  const embedOk = names.some(n => n === 'nomic-embed-text')
  results.push({
    ok: embedOk, label: 'Embedder',
    msg: embedOk ? 'nomic-embed-text ready' : 'not found — run: ollama pull nomic-embed-text',
    fatal: true,
  })
  if (!embedOk) fatalFail = true

  // 4. Free RAM
  const freeGb   = os.freemem()  / 1e9
  const needGb   = estimateModelRam(activeModel)
  const ramOk    = freeGb >= needGb
  results.push({
    ok: ramOk, label: 'RAM',
    msg: ramOk
      ? `${freeGb.toFixed(1)}GB free — enough for ${activeModel}`
      : `only ${freeGb.toFixed(1)}GB free, ${needGb}GB needed — close other apps or use a smaller model`,
    fatal: false,
  })

  // 5. Project path
  const projectPath = config.lastProjectPath
  const projOk = !!(projectPath)
  results.push({
    ok: projOk, label: 'Project',
    msg: projOk ? projectPath : 'not set — run: project set <path>',
    fatal: false,
  })

  printResults(results)

  if (fatalFail) {
    renderer.error('\nFix the issues above before continuing.')
    process.exit(1)
  }

  renderer.muted('')
}

function printResults(results) {
  for (const r of results) {
    const tag   = r.ok ? 'ok  ' : (r.fatal ? 'FAIL' : 'warn')
    const label = r.label.padEnd(14)
    if (r.ok) {
      renderer.success(`  [${tag}] ${label} ${r.msg}`)
    } else if (r.fatal) {
      renderer.error(`  [${tag}] ${label} ${r.msg}`)
    } else {
      renderer.warn(`  [${tag}] ${label} ${r.msg}`)
    }
  }
}
