#!/usr/bin/env node
import { loadConfig }      from '../src/config.js'
import { runHealthCheck }  from '../src/features/health-check.js'
import { startTerminal }   from '../src/terminal/index.js'

const config = loadConfig()
await runHealthCheck(config)
await startTerminal(config)
