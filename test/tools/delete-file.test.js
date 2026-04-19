import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path   from 'path'
import fs     from 'fs'
import { deleteFile } from '../../src/tools/delete-file.js'
import { RollbackManager } from '../../src/features/rollback.js'
import { createTestProject } from '../helpers/test-project.js'
import { loadIgnorePatterns } from '../../src/ignore.js'
import Database from 'better-sqlite3'
import { SCHEMA_SQL } from '../../src/db/schema.js'

function makeDb() {
  const db = new Database(':memory:')
  db.exec(SCHEMA_SQL)
  db.prepare("INSERT INTO sessions (name, model, project_path, created_at, last_active) VALUES ('t','m','p',1,1)").run()
  return db
}

describe('delete-file tool', () => {
  it('deletes the file', () => {
    const proj = createTestProject({ 'todelete.txt': 'gone' })
    const db   = makeDb()
    const rm   = new RollbackManager(proj.path, 1, db)
    const pats = loadIgnorePatterns(proj.path)
    const filePath = path.join(proj.path, 'todelete.txt')
    try {
      deleteFile({ path: filePath, projectPath: proj.path, ignorePatterns: pats, rollbackManager: rm })
      assert.equal(fs.existsSync(filePath), false)
    } finally { proj.cleanup(); db.close() }
  })

  it('creates a backup before deleting', () => {
    const proj = createTestProject({ 'todelete.txt': 'content' })
    const db   = makeDb()
    const rm   = new RollbackManager(proj.path, 1, db)
    const pats = loadIgnorePatterns(proj.path)
    try {
      deleteFile({ path: path.join(proj.path, 'todelete.txt'), projectPath: proj.path, ignorePatterns: pats, rollbackManager: rm })
      const log = db.prepare('SELECT * FROM rollback_log').all()
      assert.equal(log.length, 1)
      assert.equal(log[0].existed_before, 1)
    } finally { proj.cleanup(); db.close() }
  })

  it('undo restores the deleted file', () => {
    const proj = createTestProject({ 'todelete.txt': 'restore me' })
    const db   = makeDb()
    const rm   = new RollbackManager(proj.path, 1, db)
    const pats = loadIgnorePatterns(proj.path)
    const filePath = path.join(proj.path, 'todelete.txt')
    try {
      deleteFile({ path: filePath, projectPath: proj.path, ignorePatterns: pats, rollbackManager: rm })
      rm.undo()
      assert.ok(fs.existsSync(filePath))
      assert.equal(fs.readFileSync(filePath, 'utf8'), 'restore me')
    } finally { proj.cleanup(); db.close() }
  })
})
