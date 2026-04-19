import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { cosineSimilarity } from '../../src/rag/embedder.js'

describe('cosine similarity', () => {
  it('identical vectors → 1', () => {
    const a = [1, 0, 0]
    assert.equal(cosineSimilarity(a, a), 1)
  })

  it('orthogonal vectors → 0', () => {
    const score = cosineSimilarity([1, 0], [0, 1])
    assert.ok(Math.abs(score) < 1e-10)
  })

  it('opposite vectors → -1', () => {
    const score = cosineSimilarity([1, 0], [-1, 0])
    assert.equal(score, -1)
  })

  it('zero vector → 0 (no division by zero)', () => {
    const score = cosineSimilarity([0, 0], [1, 1])
    assert.equal(score, 0)
  })
})
