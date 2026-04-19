import { embedText } from '../ollama/client.js'

/**
 * Generates a single embedding for the given text using nomic-embed-text.
 * Prefixes with "file: <path>" for context when a filePath is provided.
 */
export async function embed(text, filePath = null) {
  const prompt = filePath ? `file: ${filePath}\n${text}` : text
  return embedText(prompt)
}

/**
 * Embeds an array of texts sequentially.
 * Calls onProgress(current, total) after each embedding.
 */
export async function embedBatch(items, onProgress = null) {
  const results = []
  for (let i = 0; i < items.length; i++) {
    results.push(await embed(items[i].text, items[i].filePath))
    if (onProgress) onProgress(i + 1, items.length)
  }
  return results
}

/**
 * Computes cosine similarity between two float vectors.
 */
export function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}
