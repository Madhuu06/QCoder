import fs   from 'fs'
import path from 'path'
import { chunkFile }       from './chunker.js'
import { embed }           from './embedder.js'
import { shouldIgnore, loadIgnorePatterns } from '../ignore.js'
import * as renderer       from '../terminal/renderer.js'

const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx',
  '.py', '.java', '.go', '.rs',
  '.json', '.md', '.sql', '.css', '.html', '.txt',
])

const MAX_FILE_SIZE = 100_000  // 100 KB

/**
 * Indexes the entire project. Deletes existing chunks first.
 * Updates rag_meta on completion.
 * Shows in-place progress bar via renderer.progressBar().
 */
export async function buildIndex(projectPath, db) {
  const ignorePatterns = loadIgnorePatterns(projectPath)
  const allFiles       = walkFiles(projectPath, ignorePatterns)
  const codeFiles      = allFiles.filter(f => {
    const ext = path.extname(f).toLowerCase()
    return SUPPORTED_EXTENSIONS.has(ext)
  })

  // Clear existing index for this project
  db.prepare('DELETE FROM rag_chunks WHERE project_path = ?').run(projectPath)

  renderer.muted(`  indexing ${codeFiles.length} files...`)

  let chunkCount = 0

  for (let i = 0; i < codeFiles.length; i++) {
    const filePath = codeFiles[i]

    renderer.progressBar(i, codeFiles.length)

    try {
      const stat = fs.statSync(filePath)
      if (stat.size > MAX_FILE_SIZE) continue

      const content = fs.readFileSync(filePath, 'utf8')
      const chunks  = chunkFile(filePath, content)

      for (const chunk of chunks) {
        const embedding = await embed(chunk.content, chunk.file)
        db.prepare(`
          INSERT INTO rag_chunks
          (project_path, file_path, chunk_type, chunk_name, content, start_line, embedding, indexed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          projectPath,
          chunk.file,
          chunk.type,
          chunk.name,
          chunk.content,
          chunk.startLine,
          JSON.stringify(embedding),
          Date.now()
        )
        chunkCount++
      }
    } catch { /* skip unreadable/parse-failed files */ }
  }

  renderer.progressBar(codeFiles.length, codeFiles.length)

  db.prepare(`
    INSERT OR REPLACE INTO rag_meta (project_path, last_indexed, chunk_count, model_used)
    VALUES (?, ?, ?, ?)
  `).run(projectPath, Date.now(), chunkCount, 'nomic-embed-text')

  renderer.success(`\n  indexed ${codeFiles.length} files → ${chunkCount} chunks`)
  return chunkCount
}

/** Re-indexes a single file. Called by the file watcher. */
export async function reindexFile(filePath, projectPath, db) {
  const ext = path.extname(filePath).toLowerCase()
  if (!SUPPORTED_EXTENSIONS.has(ext)) return

  try {
    const stat = fs.statSync(filePath)
    if (stat.size > MAX_FILE_SIZE) return

    const content = fs.readFileSync(filePath, 'utf8')
    const chunks  = chunkFile(filePath, content)

    db.prepare('DELETE FROM rag_chunks WHERE file_path = ?').run(filePath)

    for (const chunk of chunks) {
      const embedding = await embed(chunk.content, chunk.file)
      db.prepare(`
        INSERT INTO rag_chunks
        (project_path, file_path, chunk_type, chunk_name, content, start_line, embedding, indexed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectPath, chunk.file, chunk.type, chunk.name,
        chunk.content, chunk.startLine, JSON.stringify(embedding), Date.now()
      )
    }
  } catch { /* silent on watcher re-index errors */ }
}

function walkFiles(dir, ignorePatterns, results = []) {
  const projectPath = dir
  const walk = (current) => {
    let entries
    try { entries = fs.readdirSync(current, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (shouldIgnore(full, projectPath, ignorePatterns)) continue
      if (entry.isDirectory()) walk(full)
      else results.push(full)
    }
  }
  walk(dir)
  return results
}
