import { retrieveRelevantChunks } from './retriever.js'
import path from 'path'

/**
 * Retrieves relevant RAG chunks and injects them into the prompt,
 * along with the project memory block and import graph hints.
 */
export async function buildPromptWithContext(task, projectPath, db, memory, touchedFiles = new Set()) {
  let chunks = []
  try {
    chunks = await retrieveRelevantChunks(task, projectPath, db, touchedFiles)
  } catch {
    // RAG unavailable (e.g. not indexed yet) — continue without context
  }

  let contextBlock = ''
  if (chunks.length > 0) {
    const formatted = chunks.map(c => {
      const relPath  = path.relative(projectPath, c.file_path).replace(/\\/g, '/')
      const lang     = extToLang(c.file_path)
      const imports  = extractImports(c.content, c.file_path)
      const importHint = imports.length > 0
        ? `\n[This file imports: ${imports.join(', ')}]`
        : ''
      return `### ${relPath} — ${c.chunk_name}${importHint}
\`\`\`${lang}
${c.content}
\`\`\``
    }).join('\n\n')

    contextBlock = `## Relevant code from this project:\n\n${formatted}\n\n---\n`
  }

  const memoryBlock = memory ? `## Project knowledge:\n${memory}\n\n` : ''

  return `${memoryBlock}${contextBlock}Task: ${task}`
}

/**
 * Cheaply extracts imported module names from a file chunk using regex.
 * Works for JS/TS (import/require) and Python (import/from).
 */
function extractImports(content, filePath) {
  const imports = new Set()
  const ext = filePath.match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? ''

  if (['.js', '.ts', '.jsx', '.tsx', '.mjs'].includes(ext)) {
    // ES modules: import ... from '...'
    const esm = content.matchAll(/from\s+['"]([^'"]+)['"]/g)
    for (const m of esm) imports.add(m[1].split('/').pop())
    // CommonJS: require('...')
    const cjs = content.matchAll(/require\(['"]([^'"]+)['"]\)/g)
    for (const m of cjs) imports.add(m[1].split('/').pop())
  } else if (ext === '.py') {
    const py = content.matchAll(/^(?:import|from)\s+(\S+)/gm)
    for (const m of py) imports.add(m[1].split('.')[0])
  }

  return [...imports].slice(0, 8)  // cap at 8 to keep hint concise
}

function extToLang(filePath) {
  const ext = filePath.match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? ''
  const MAP = { '.js': 'js', '.ts': 'ts', '.jsx': 'jsx', '.tsx': 'tsx',
                '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java',
                '.json': 'json', '.md': 'markdown', '.css': 'css', '.html': 'html' }
  return MAP[ext] ?? ''
}
