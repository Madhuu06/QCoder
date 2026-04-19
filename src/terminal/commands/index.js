import { buildIndex }            from '../../rag/indexer.js'
import { retrieveRelevantChunks } from '../../rag/retriever.js'
import * as renderer              from '../renderer.js'
import path from 'path'

export default async function ragIndex(parsed, context) {
  const { sub, args, db } = { ...parsed, db: context.db }
  if (!db) { renderer.warn('no project open'); return }

  if (sub === 'build' || sub === 'rebuild') {
    if (sub === 'rebuild') {
      db.prepare('DELETE FROM rag_chunks WHERE project_path = ?').run(context.projectPath)
      renderer.muted('  cleared existing index')
    }
    await buildIndex(context.projectPath, db)
    return
  }

  if (sub === 'status') {
    const meta = db.prepare('SELECT * FROM rag_meta WHERE project_path = ?').get(context.projectPath)
    if (!meta) { renderer.muted('  not indexed yet — run: index build'); return }
    renderer.header('INDEX STATUS')
    renderer.table([
      ['Chunks',       String(meta.chunk_count)],
      ['Last indexed', new Date(meta.last_indexed).toLocaleString()],
      ['Model',        meta.model_used],
    ])
    return
  }

  if (sub === 'search') {
    const query = args[0]
    if (!query) { renderer.error('usage: index search "<query>"'); return }
    renderer.muted(`  searching for: ${query}`)
    const chunks = await retrieveRelevantChunks(query, context.projectPath, db)
    if (!chunks.length) { renderer.muted('  no results above threshold'); return }
    renderer.header(`TOP ${chunks.length} RESULTS`)
    for (const c of chunks) {
      const rel = path.relative(context.projectPath, c.file_path).replace(/\\/g, '/')
      renderer.muted(`  [${c.similarity.toFixed(2)}] ${rel} — ${c.chunk_name}`)
      renderer.muted(c.content.split('\n').slice(0, 5).map(l => `    ${l}`).join('\n'))
      renderer.divider()
    }
    return
  }

  renderer.error('usage: index build | rebuild | status | search "<query>"')
}
