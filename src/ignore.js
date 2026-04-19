import fs   from 'fs'
import path from 'path'
import { minimatch } from 'minimatch'

// Hardcoded security floor — never overridable by user patterns
const ALWAYS_IGNORE = [
  '.env',
  '.env.*',
  '.env.local',
  '.env.production',
  '.env.development',
  'node_modules/**',
  '.git/**',
  '*.key',
  '*.pem',
  '*.cert',
  '*.p12',
  'dist/**',
  'build/**',
  '.qcoder/**',
  '.DS_Store',
  'Thumbs.db',
]

/**
 * Loads ignore patterns: hardcoded always-ignore list + user's .qcoder/ignore file.
 */
export function loadIgnorePatterns(projectPath) {
  const ignorePath = path.join(projectPath, '.qcoder', 'ignore')
  let userPatterns = []

  if (fs.existsSync(ignorePath)) {
    userPatterns = fs.readFileSync(ignorePath, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
  }

  return [...ALWAYS_IGNORE, ...userPatterns]
}

/**
 * Returns true if the given absolute filePath should be ignored.
 * Uses dot:true so hidden files like .env match .env.* patterns.
 */
export function shouldIgnore(filePath, projectPath, patterns) {
  const rel = path.relative(projectPath, filePath).replace(/\\/g, '/')
  return patterns.some(pattern => minimatch(rel, pattern, { dot: true }))
}
