import { retrieveRelevantChunks } from './retriever.js'
import path from 'path'

/**
 * Retrieves relevant RAG chunks and injects them into the prompt,
 * along with the project memory block.
 */
export async function buildPromptWithContext(task, projectPath, db, memory) {
  let chunks = []
  try {
    chunks = await retrieveRelevantChunks(task, projectPath, db)
  } catch {
    // RAG unavailable (e.g. not indexed yet) — continue without context
  }

  let contextBlock = ''
  if (chunks.length > 0) {
    const formatted = chunks.map(c => {
      const relPath = path.relative(projectPath, c.file_path).replace(/\\/g, '/')
      const lang    = extToLang(c.file_path)
      return `### ${relPath} — ${c.chunk_name} (score: ${c.similarity.toFixed(2)})
\`\`\`${lang}
${c.content}
\`\`\``
    }).join('\n\n')

    contextBlock = `## Relevant code from this project:\n\n${formatted}\n\n---\n`
  }

  const memoryBlock = memory ? `## Project knowledge:\n${memory}\n\n` : ''

  return `${memoryBlock}${contextBlock}Task: ${task}`
}

function extToLang(filePath) {
  const ext = filePath.match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? ''
  const MAP = { '.js': 'js', '.ts': 'ts', '.jsx': 'jsx', '.tsx': 'tsx',
                '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java',
                '.json': 'json', '.md': 'markdown', '.css': 'css', '.html': 'html' }
  return MAP[ext] ?? ''
}
