/**
 * End-to-end scenario: create a project with a syntax error, ask QCoder to fix it.
 * Run manually (requires Ollama running): node test/scenarios/fix-syntax-error.js
 */
import { execSync } from 'child_process'
import path   from 'path'
import fs     from 'fs'
import { createTestProject } from '../helpers/test-project.js'
import { openDb }  from '../../src/db/index.js'
import { runTask } from '../../src/agent/runner.js'

const BROKEN_JS = `
function add(a b) {
  return a + b
}
module.exports = { add }
`.trim()

const proj = createTestProject({ 'index.js': BROKEN_JS })
openDb(proj.path)

const db = (await import('../../src/db/index.js')).getDb()
const sessionRes = db.prepare(
  "INSERT INTO sessions (name, model, project_path, trust_level, created_at, last_active) VALUES ('test','qwen2.5-coder:7b',?,?,?,?)"
).run(proj.path, 'high', Date.now(), Date.now())

console.log('[scenario] Running fix-syntax-error...')
await runTask('Fix the syntax error in index.js', {
  sessionId:   sessionRes.lastInsertRowid,
  trustLevel:  'high',
  projectPath: proj.path,
})

// Verify: node --check should pass
try {
  execSync(`node --check ${path.join(proj.path, 'index.js')}`, { stdio: 'pipe' })
  console.log('[scenario] PASS — file passes node --check')
} catch (e) {
  console.error('[scenario] FAIL — file still has syntax errors:', e.stderr?.toString())
  process.exitCode = 1
} finally {
  proj.cleanup()
}
