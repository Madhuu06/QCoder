import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path   from 'path'
import { loadIgnorePatterns, shouldIgnore } from '../src/ignore.js'
import { createTestProject } from './helpers/test-project.js'

describe('ignore', () => {
  it('.env is always ignored regardless of user patterns', () => {
    const proj = createTestProject({ '.env': 'SECRET=x' })
    try {
      const pats   = loadIgnorePatterns(proj.path)
      const result = shouldIgnore(path.join(proj.path, '.env'), proj.path, pats)
      assert.ok(result)
    } finally { proj.cleanup() }
  })

  it('node_modules is always ignored', () => {
    const proj = createTestProject({})
    try {
      const pats   = loadIgnorePatterns(proj.path)
      const result = shouldIgnore(path.join(proj.path, 'node_modules', 'lodash', 'index.js'), proj.path, pats)
      assert.ok(result)
    } finally { proj.cleanup() }
  })

  it('.qcoder directory is always ignored', () => {
    const proj = createTestProject({})
    try {
      const pats   = loadIgnorePatterns(proj.path)
      const result = shouldIgnore(path.join(proj.path, '.qcoder', 'db.sqlite'), proj.path, pats)
      assert.ok(result)
    } finally { proj.cleanup() }
  })

  it('regular source file is not ignored', () => {
    const proj = createTestProject({ 'src/index.js': 'hello' })
    try {
      const pats   = loadIgnorePatterns(proj.path)
      const result = shouldIgnore(path.join(proj.path, 'src', 'index.js'), proj.path, pats)
      assert.equal(result, false)
    } finally { proj.cleanup() }
  })

  it('user pattern in .qcoder/ignore is applied', () => {
    const proj = createTestProject({
      '.qcoder/ignore': 'generated/**',
      'generated/out.js': 'output',
    })
    try {
      const pats   = loadIgnorePatterns(proj.path)
      const result = shouldIgnore(path.join(proj.path, 'generated', 'out.js'), proj.path, pats)
      assert.ok(result)
    } finally { proj.cleanup() }
  })
})
