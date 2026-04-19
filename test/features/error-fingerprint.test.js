import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { fingerprintError, checkKnownError, saveErrorFix } from '../../src/features/error-fingerprint.js'
import Database from 'better-sqlite3'
import { SCHEMA_SQL } from '../../src/db/schema.js'

function makeDb() {
  const db = new Database(':memory:')
  db.exec(SCHEMA_SQL)
  return db
}

describe('error-fingerprint', () => {
  it('same error type with different paths → same fingerprint', () => {
    const e1 = "TypeError: Cannot read property 'foo' of undefined\n  at /home/user/project/src/index.js:42:18"
    const e2 = "TypeError: Cannot read property 'foo' of undefined\n  at /home/other/src/utils.js:99:5"
    assert.equal(fingerprintError(e1), fingerprintError(e2))
  })

  it('different error types → different fingerprints', () => {
    const e1 = "TypeError: foo is not a function"
    const e2 = "ReferenceError: foo is not defined"
    assert.notEqual(fingerprintError(e1), fingerprintError(e2))
  })

  it('returns null for unknown error', () => {
    const db  = makeDb()
    const fix = checkKnownError(db, 'SyntaxError: Unexpected token')
    assert.equal(fix, null)
    db.close()
  })

  it('returns fix for known error', () => {
    const db = makeDb()
    saveErrorFix(db, 'TypeError: foo is not a function at /path.js:1:1', 'check that foo is exported correctly')
    const fix = checkKnownError(db, 'TypeError: foo is not a function at /other.js:9:9')
    assert.ok(fix)
    assert.ok(fix.includes('check that foo is exported'))
    db.close()
  })

  it('increments times_seen on repeated match', () => {
    const db = makeDb()
    saveErrorFix(db, 'TypeError: x is not a function at /a.js:1:1', 'fix')
    checkKnownError(db, 'TypeError: x is not a function at /b.js:2:2')
    const row = db.prepare('SELECT times_seen FROM error_patterns').get()
    assert.ok(row.times_seen >= 1)
    db.close()
  })
})
