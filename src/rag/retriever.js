import { embed, cosineSimilarity } from './embedder.js'
import { getConfig } from '../db/index.js'

/**
 * Retrieves the top-K most relevant chunks for the given query.
 * topK and similarityThreshold are read from system_config.
 */
export async function retrieveRelevantChunks(query, projectPath, db) {
  const topK      = parseInt(getConfig('rag_top_k')                ?? '5')
  const threshold = parseFloat(getConfig('rag_similarity_threshold') ?? '0.5')

  const chunks = db.prepare(
    'SELECT * FROM rag_chunks WHERE project_path = ?'
  ).all(projectPath)

  if (chunks.length === 0) return []

  const queryEmbedding = await embed(query)

  const scored = chunks.map(chunk => {
    let chunkEmbedding
    try { chunkEmbedding = JSON.parse(chunk.embedding) } catch { return null }
    return {
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, chunkEmbedding),
    }
  }).filter(Boolean)

  return scored
    .filter(c => c.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}
