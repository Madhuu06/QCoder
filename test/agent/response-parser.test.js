import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../../src/agent/response-parser.js'

describe('response-parser', () => {
  it('parses a clean JSON tool call', () => {
    const r = parse('{ "tool": "read_file", "args": { "path": "index.js" } }')
    assert.equal(r.type, 'tool')
    assert.equal(r.tool, 'read_file')
    assert.equal(r.args.path, 'index.js')
  })

  it('extracts JSON embedded in prose', () => {
    const r = parse('Sure! Here is the tool call: { "tool": "list_files", "args": {} } done.')
    assert.equal(r.type, 'tool')
    assert.equal(r.tool, 'list_files')
  })

  it('returns retry for invalid JSON', () => {
    const r = parse('I will now read the file.')
    assert.equal(r.type, 'retry')
    assert.ok(r.message.length > 0)
  })

  it('returns retry for unknown tool name', () => {
    const r = parse('{ "tool": "hack_the_planet", "args": {} }')
    assert.equal(r.type, 'retry')
    assert.match(r.message, /Unknown tool/)
  })

  it('returns retry for missing args field', () => {
    const r = parse('{ "tool": "read_file" }')
    assert.equal(r.type, 'tool')   // missing args → defaults to {}
    assert.deepEqual(r.args, {})
  })

  it('accepts done tool', () => {
    const r = parse('{ "tool": "done", "args": { "summary": "all done" } }')
    assert.equal(r.type, 'tool')
    assert.equal(r.tool, 'done')
  })
})
