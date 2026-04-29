import { embed, cosineSimilarity } from './embedder.js'
import { getConfig }               from '../db/index.js'
import * as ollama                 from '../ollama/client.js'

/**
 * Retrieves the top-K most relevant chunks for the given query.
 * - Expands the query with the model before embedding for better recall
 * - Reranks results: boosts recently modified files and session-touched files
 */
export async function retrieveRelevantChunks(query, projectPath, db, touchedFiles = new Set()) {
  const topK      = parseInt(getConfig('rag_top_k')                ?? '5')
  const threshold = parseFloat(getConfig('rag_similarity_threshold') ?? '0.4')

  const chunks = db.prepare(
    'SELECT * FROM rag_chunks WHERE project_path = ?'
  ).all(projectPath)

  if (chunks.length === 0) return []

  // Query expansion: expand short/vague queries for better embedding coverage
  const expandedQuery = await expandQuery(query)
  const queryEmbedding = await embed(expandedQuery)

  const now = Date.now()
  const ONE_HOUR = 60 * 60 * 1000

  const scored = chunks.map(chunk => {
    let chunkEmbedding
    try { chunkEmbedding = JSON.parse(chunk.embedding) } catch { return null }

    let score = cosineSimilarity(queryEmbedding, chunkEmbedding)

    // Reranker boosts
    if (touchedFiles.has(chunk.file_path))              score += 0.15  // touched this session
    if ((now - (chunk.updated_at ?? 0)) < ONE_HOUR)    score += 0.10  // modified in last hour

    return { ...chunk, similarity: score }
  }).filter(Boolean)

  return scored
    .filter(c => c.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}

/**
 * Asks the model to expand a short query into richer search terms.
 * Falls back to the original query if expansion fails or times out.
 */
async function expandQuery(query) {
  // Only expand short queries — long ones are already descriptive
  if (query.split(' ').length > 8) return query

  try {
    const messages = [{
      role:    'user',
      content: `Expand this code search query into 6-10 related technical keywords, separated by spaces. Output ONLY the keywords, nothing else.\n\nQuery: ${query}`,
    }]
    const expanded = await Promise.race([
      ollama.chat('nomic-embed-text', messages, null).catch(() => null),
      new Promise(resolve => setTimeout(() => resolve(null), 3000)),
    ])
    if (expanded && expanded.trim().length > 0) {
      return `${query} ${expanded.trim()}`
    }
  } catch { /* fall through */ }

  return query
}
