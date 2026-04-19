import fs   from 'fs'
import path  from 'path'
import os    from 'os'

/**
 * Creates a temporary directory pre-populated with the given file map.
 * Returns { path: string, cleanup: fn }
 */
export function createTestProject(fileMap = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qcoder-test-'))

  // Create .qcoder subdirectory so DB init works
  fs.mkdirSync(path.join(tmpDir, '.qcoder', 'backups'), { recursive: true })

  for (const [relPath, content] of Object.entries(fileMap)) {
    const full = path.join(tmpDir, relPath)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, content, 'utf8')
  }

  return {
    path: tmpDir,
    cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
  }
}
