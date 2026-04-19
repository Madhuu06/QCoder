import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path   from 'path'
import fs     from 'fs'
import { RollbackManager } from '../../src/features/rollback.js'
import { createTestProject } from '../helpers/test-project.js'
import Database from 'better-sqlite3'
import { SCHEMA_SQL } from '../../src/db/schema.js'

function makeDb() {
  const db = new Database(':memory:')
  db.exec(SCHEMA_SQL)
  db.prepare("INSERT INTO sessions (name, model, project_path, created_at, last_active) VALUES ('t','m','p',1,1)").run()
  return db
}

describe('RollbackManager', () => {
  it('backup logs to rollback_log', () => {
    const proj = createTestProject({ 'a.txt': 'hello' })
    const db   = makeDb()
    const rm   = new RollbackManager(proj.path, 1, db)
    rm.backup(path.join(proj.path, 'a.txt'))
    const log  = db.prepare('SELECT * FROM rollback_log').all()
    assert.equal(log.length, 1)
    assert.equal(log[0].existed_before, 1)
    proj.cleanup(); db.close()
  })

  it('undo restores original content after write', () => {
    const proj = createTestProject({ 'b.txt': 'original' })
    const db   = makeDb()
    const rm   = new RollbackManager(proj.path, 1, db)
    const file = path.join(proj.path, 'b.txt')
    rm.backup(file)
    fs.writeFileSync(file, 'changed')
    rm.undo()
    assert.equal(fs.readFileSync(file, 'utf8'), 'original')
    proj.cleanup(); db.close()
  })

  it('undoAll restores all files in session', () => {
    const proj = createTestProject({ 'c.txt': 'c', 'd.txt': 'd' })
    const db   = makeDb()
    const rm   = new RollbackManager(proj.path, 1, db)
    const c    = path.join(proj.path, 'c.txt')
    const d    = path.join(proj.path, 'd.txt')
    rm.backup(c); fs.writeFileSync(c, 'C changed')
    rm.backup(d); fs.writeFileSync(d, 'D changed')
    rm.undoAll()
    assert.equal(fs.readFileSync(c, 'utf8'), 'c')
    assert.equal(fs.readFileSync(d, 'utf8'), 'd')
    proj.cleanup(); db.close()
  })

  it('undo deletes agent-created file (existed_before=0)', () => {
    const proj = createTestProject({})
    const db   = makeDb()
    const rm   = new RollbackManager(proj.path, 1, db)
    const file = path.join(proj.path, 'new.txt')
    rm.backup(file)  // file doesn't exist yet → existed_before=0
    fs.writeFileSync(file, 'created by agent')
    rm.undo()
    assert.equal(fs.existsSync(file), false)
    proj.cleanup(); db.close()
  })
})
