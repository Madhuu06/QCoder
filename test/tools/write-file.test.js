import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path   from 'path'
import fs     from 'fs'
import { writeFile }  from '../../src/tools/write-file.js'
import { RollbackManager } from '../../src/features/rollback.js'
import { createTestProject } from '../helpers/test-project.js'
import { loadIgnorePatterns } from '../../src/ignore.js'
import Database from 'better-sqlite3'
import { SCHEMA_SQL } from '../../src/db/schema.js'

function makeDb(tmpDir) {
  const db = new Database(':memory:')
  db.exec(SCHEMA_SQL)
  db.prepare("INSERT INTO sessions (name, model, project_path, created_at, last_active) VALUES ('t','m','p',1,1)").run()
  return db
}

describe('write-file tool', () => {
  it('writes content to file', () => {
    const proj = createTestProject({ 'index.js': 'old' })
    const db   = makeDb(proj.path)
    try {
      const rm       = new RollbackManager(proj.path, 1, db)
      const patterns = loadIgnorePatterns(proj.path)
      writeFile({ path: path.join(proj.path, 'index.js'), content: 'new content', projectPath: proj.path, ignorePatterns: patterns, rollbackManager: rm })
      assert.equal(fs.readFileSync(path.join(proj.path, 'index.js'), 'utf8'), 'new content')
    } finally { proj.cleanup(); db.close() }
  })

  it('creates a backup before writing', () => {
    const proj = createTestProject({ 'index.js': 'original' })
    const db   = makeDb(proj.path)
    try {
      const rm       = new RollbackManager(proj.path, 1, db)
      const patterns = loadIgnorePatterns(proj.path)
      writeFile({ path: path.join(proj.path, 'index.js'), content: 'changed', projectPath: proj.path, ignorePatterns: patterns, rollbackManager: rm })
      const log = db.prepare('SELECT * FROM rollback_log WHERE session_id = 1').all()
      assert.equal(log.length, 1)
      assert.equal(log[0].existed_before, 1)
    } finally { proj.cleanup(); db.close() }
  })

  it('undo restores original content', () => {
    const proj = createTestProject({ 'index.js': 'original' })
    const db   = makeDb(proj.path)
    try {
      const rm       = new RollbackManager(proj.path, 1, db)
      const patterns = loadIgnorePatterns(proj.path)
      writeFile({ path: path.join(proj.path, 'index.js'), content: 'changed', projectPath: proj.path, ignorePatterns: patterns, rollbackManager: rm })
      rm.undo()
      assert.equal(fs.readFileSync(path.join(proj.path, 'index.js'), 'utf8'), 'original')
    } finally { proj.cleanup(); db.close() }
  })
})
