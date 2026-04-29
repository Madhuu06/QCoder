import { parse } from 'acorn'
import { simple } from 'acorn-walk'

const SUPPORTED_AST  = new Set(['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx'])
// Line-based chunking is used for all other text files (including Go, Rust, Java, C, etc.)
const SUPPORTED_TEXT = new Set([
  '.py', '.go', '.rs', '.java', '.c', '.cpp', '.cs',
  '.md', '.json', '.sql', '.css', '.html', '.yaml', '.toml',
])

/**
 * Splits a source file into logical chunks.
 * JS/TS files: AST-based (functions, classes, arrow functions).
 * Other files: 60-line sliding window.
 */
export function chunkFile(filePath, content) {
  const ext = filePath.match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? ''

  if (SUPPORTED_AST.has(ext)) {
    try {
      return chunkByAst(filePath, content)
    } catch {
      // Parse failed — fall through to line-based
    }
  }

  // Only chunk known text formats — skip binaries and unknown extensions
  if (SUPPORTED_TEXT.has(ext) || SUPPORTED_AST.has(ext)) {
    return chunkByLines(filePath, content)
  }

  return []
}

function chunkByAst(filePath, content) {
  const ast = parse(content, {
    ecmaVersion:  'latest',
    sourceType:   'module',
    locations:    true,
    onInsertedSemicolon: () => {},
    onTrailingComma:     () => {},
  })

  const chunks = []

  simple(ast, {
    FunctionDeclaration(node) {
      chunks.push({
        file:      filePath,
        type:      'function',
        name:      node.id?.name ?? 'anonymous',
        content:   content.slice(node.start, node.end),
        startLine: node.loc?.start?.line ?? 0,
      })
    },
    ClassDeclaration(node) {
      chunks.push({
        file:      filePath,
        type:      'class',
        name:      node.id?.name ?? 'anonymous',
        content:   content.slice(node.start, node.end),
        startLine: node.loc?.start?.line ?? 0,
      })
    },
    VariableDeclaration(node) {
      for (const decl of node.declarations) {
        const isFunc =
          decl.init?.type === 'ArrowFunctionExpression' ||
          decl.init?.type === 'FunctionExpression'
        if (isFunc) {
          chunks.push({
            file:      filePath,
            type:      'function',
            name:      decl.id?.name ?? 'anonymous',
            content:   content.slice(node.start, node.end),
            startLine: node.loc?.start?.line ?? 0,
          })
        }
      }
    },
  })

  // Fallback: if AST produced no chunks (e.g. only top-level expressions), chunk by lines
  return chunks.length > 0 ? chunks : chunkByLines(filePath, content)
}

function chunkByLines(filePath, content) {
  const lines     = content.split('\n')
  const chunkSize = 60
  const chunks    = []

  for (let i = 0; i < lines.length; i += chunkSize) {
    const slice = lines.slice(i, i + chunkSize)
    chunks.push({
      file:      filePath,
      type:      'lines',
      name:      `lines ${i + 1}-${Math.min(i + chunkSize, lines.length)}`,
      content:   slice.join('\n'),
      startLine: i + 1,
    })
  }

  return chunks
}
