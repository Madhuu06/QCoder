/**
 * End-to-end scenario: ask QCoder to create a utils.js with an add function.
 * Run manually (requires Ollama running): node test/scenarios/create-file.js
 */
import fs from 'fs'
import path from 'path'
import { createTestProject } from '../helpers/test-project.js'
import { openDb, getDb }     from '../../src/db/index.js'
import { runTask }           from '../../src/agent/runner.js'

const proj = createTestProject({})
openDb(proj.path)

const db = getDb()
const sessionRes = db.prepare(
  "INSERT INTO sessions (name, model, project_path, trust_level, created_at, last_active) VALUES ('test','qwen2.5-coder:7b',?,?,?,?)"
).run(proj.path, 'high', Date.now(), Date.now())

console.log('[scenario] Running create-file...')
await runTask('Create utils.js with an add(a, b) function that returns a + b', {
  sessionId:   sessionRes.lastInsertRowid,
  trustLevel:  'high',
  projectPath: proj.path,
})

const utilPath = path.join(proj.path, 'utils.js')
if (!fs.existsSync(utilPath)) {
  console.error('[scenario] FAIL — utils.js was not created')
  process.exitCode = 1
} else {
  const content = fs.readFileSync(utilPath, 'utf8')
  if (!content.includes('function') && !content.includes('=>')) {
    console.error('[scenario] FAIL — no function found in utils.js')
    process.exitCode = 1
  } else {
    console.log('[scenario] PASS — utils.js created with a function')
  }
}

proj.cleanup()
