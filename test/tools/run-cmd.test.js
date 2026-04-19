import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runCmd } from '../../src/tools/run-cmd.js'

describe('run-cmd tool', () => {
  it('runs a whitelisted command', async () => {
    const result = await runCmd({ command: 'node --version' })
    assert.ok(result.stdout.startsWith('v'))
    assert.equal(result.exitCode, 0)
  })

  it('rejects non-whitelisted commands', async () => {
    const result = await runCmd({ command: 'rm -rf /' })
    assert.ok(result.error)
    assert.match(result.error, /not allowed/)
  })

  it('returns error on timeout', async () => {
    // node -e with sleep-like infinite loop, 100ms timeout
    const result = await runCmd({ command: 'node -e "setTimeout(()=>{},60000)"', timeoutMs: 100 })
    assert.ok(result.error)
    assert.match(result.error, /timed out/)
  })

  it('returns stdout and stderr separately', async () => {
    const result = await runCmd({ command: 'node -e "process.stdout.write(\'hi\')"' })
    assert.equal(result.stdout, 'hi')
  })
})
