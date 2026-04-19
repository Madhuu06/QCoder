import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildSystemPrompt } from '../../src/prompts/system.js'
import { TOOLS, DONE_TOOL }  from '../../src/tools/index.js'

describe('system prompt builder', () => {
  const base = { memory: '', tools: TOOLS, trustLevel: 'medium' }

  it('includes every tool name exactly once', () => {
    const prompt = buildSystemPrompt(base)
    for (const t of TOOLS) {
      const occurrences = (prompt.match(new RegExp('- ' + t.name + ':', 'g')) ?? []).length
      assert.equal(occurrences, 1, `${t.name} should appear exactly once`)
    }
  })

  it('includes done tool', () => {
    const prompt = buildSystemPrompt(base)
    assert.ok(prompt.includes('- done:'))
  })

  it('low trust levels says "Every action will be confirmed"', () => {
    const prompt = buildSystemPrompt({ ...base, trustLevel: 'low' })
    assert.ok(prompt.includes('Every action will be confirmed'))
  })

  it('high trust level says "Run autonomously"', () => {
    const prompt = buildSystemPrompt({ ...base, trustLevel: 'high' })
    assert.ok(prompt.includes('Run autonomously'))
  })

  it('injects memory section when memory non-empty', () => {
    const prompt = buildSystemPrompt({ ...base, memory: 'uses TypeScript' })
    assert.ok(prompt.includes('What you already know'))
    assert.ok(prompt.includes('uses TypeScript'))
  })

  it('omits memory section when memory is empty', () => {
    const prompt = buildSystemPrompt({ ...base, memory: '' })
    assert.ok(!prompt.includes('What you already know'))
  })
})
