import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chunkFile } from '../../src/rag/chunker.js'

describe('chunker', () => {
  it('extracts 3 chunks from a 3-function JS file', () => {
    const code = `
function alpha() { return 1 }
function beta() { return 2 }
function gamma() { return 3 }
    `.trim()
    const chunks = chunkFile('test.js', code)
    assert.ok(chunks.length >= 3)
    assert.ok(chunks.every(c => c.type === 'function'))
  })

  it('extracts class chunk', () => {
    const code = `class MyService { constructor() {} }`
    const chunks = chunkFile('service.js', code)
    const cls = chunks.find(c => c.type === 'class')
    assert.ok(cls)
    assert.equal(cls.name, 'MyService')
  })

  it('uses line-based chunks for non-JS files', () => {
    const rows = Array.from({ length: 80 }, (_, i) => `line ${i + 1}`).join('\n')
    const chunks = chunkFile('README.md', rows)
    assert.ok(chunks.every(c => c.type === 'lines'))
    assert.ok(chunks.length >= 2)
  })

  it('falls back to line-based on parse failure', () => {
    const broken = '{ this is not valid js at all !! }'
    const chunks = chunkFile('broken.js', broken)
    assert.ok(chunks.length > 0)
    // Should not throw
  })
})
