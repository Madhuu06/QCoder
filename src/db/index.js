import Database from 'better-sqlite3'
import fs   from 'fs'
import path from 'path'
import { SCHEMA_SQL, DEFAULT_CONFIG } from './schema.js'

let _db = null

/**
 * Opens (or creates) the SQLite DB at <projectPath>/.qcoder/db.sqlite.
 * Creates the .qcoder/backups directory. Runs schema migrations. Inserts defaults.
 */
export function openDb(projectPath) {
  const qcoderDir  = path.join(projectPath, '.qcoder')
  const backupsDir = path.join(qcoderDir, 'backups')
  fs.mkdirSync(backupsDir, { recursive: true })

  const dbPath = path.join(qcoderDir, 'db.sqlite')
  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.exec(SCHEMA_SQL)

  // Insert defaults for system_config if not already present
  const insertDefault = _db.prepare(
    'INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)'
  )
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    if (value !== null) insertDefault.run(key, String(value))
  }

  return _db
}

/** Returns the currently open DB instance (or null if not opened yet). */
export function getDb() {
  return _db
}

/** Closes the DB cleanly (called on CTRL+C shutdown). */
export function closeDb() {
  if (_db) {
    _db.close()
    _db = null
  }
}

/** Reads a single value from system_config. */
export function getConfig(key) {
  if (!_db) return null
  const row = _db.prepare('SELECT value FROM system_config WHERE key = ?').get(key)
  return row?.value ?? null
}

/** Writes a single value to system_config. */
export function setConfig(key, value) {
  if (!_db) return
  _db.prepare('INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)').run(key, String(value))
}
