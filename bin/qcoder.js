#!/usr/bin/env node
import { loadConfig }      from '../src/config.js'
import { runHealthCheck }  from '../src/features/health-check.js'
import { prewarmModel }    from '../src/ollama/prewarmer.js'
import { startTerminal }   from '../src/terminal/index.js'

const config = await loadConfig()
await runHealthCheck(config)

// Warm the model into OS page cache in the background.
// No await — user can start typing immediately.
// By the time they submit their first task, weights are already in RAM.
const activeModel = config.activeModel ?? 'qwen2.5-coder:7b'
prewarmModel(activeModel).catch(() => {})

await startTerminal(config)
