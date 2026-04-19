import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path   from 'path'
import { readFile } from '../../src/tools/read-file.js'
import { createTestProject } from '../helpers/test-project.js'
import { loadIgnorePatterns } from '../../src/ignore.js'

describe('read-file tool', () => {
  it('returns file content', () => {
    const proj = createTestProject({ 'hello.txt': 'hello world' })
    try {
      const patterns = loadIgnorePatterns(proj.path)
      const result   = readFile({ path: path.join(proj.path, 'hello.txt'), projectPath: proj.path, ignorePatterns: patterns })
      assert.equal(result, 'hello world')
    } finally { proj.cleanup() }
  })

  it('returns error for missing file', () => {
    const proj = createTestProject({})
    try {
      const patterns = loadIgnorePatterns(proj.path)
      const result   = readFile({ path: path.join(proj.path, 'missing.txt'), projectPath: proj.path, ignorePatterns: patterns })
      assert.ok(result.error)
      assert.match(result.error, /not found/)
    } finally { proj.cleanup() }
  })

  it('blocks ignored paths', () => {
    const proj = createTestProject({ '.env': 'SECRET=abc' })
    try {
      const patterns = loadIgnorePatterns(proj.path)
      const result   = readFile({ path: path.join(proj.path, '.env'), projectPath: proj.path, ignorePatterns: patterns })
      assert.ok(result.error)
      assert.match(result.error, /protected/)
    } finally { proj.cleanup() }
  })
})
