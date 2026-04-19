import fs   from 'fs'
import path from 'path'

/**
 * Manages per-session file backups for undo functionality.
 * Backup directory: <projectPath>/.qcoder/backups/session_<id>/
 */
export class RollbackManager {
  constructor(projectPath, sessionId, db) {
    this.projectPath = projectPath
    this.sessionId   = sessionId
    this.db          = db
    this.backupDir   = path.join(projectPath, '.qcoder', 'backups', `session_${sessionId}`)
    fs.mkdirSync(this.backupDir, { recursive: true })
  }

  /**
   * Backs up a file before it's modified or deleted.
   * Must be called BEFORE any write/delete operation.
   */
  backup(filePath) {
    const existed   = fs.existsSync(filePath)
    const timestamp = Date.now()
    const index     = this._nextIndex()
    const safeName  = path.relative(this.projectPath, filePath)
      .replace(/[/\\]/g, '_')
      .replace(/^_+/, '')
    const backupPath = path.join(this.backupDir, `${index}_${safeName}_${timestamp}.bak`)

    if (existed) {
      fs.copyFileSync(filePath, backupPath)
    }

    this.db.prepare(`
      INSERT INTO rollback_log (session_id, original_path, backup_path, existed_before, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(this.sessionId, filePath, backupPath, existed ? 1 : 0, timestamp)

    return backupPath
  }

  /** Reverts the most recent change in this session. */
  undo() {
    const last = this.db.prepare(`
      SELECT * FROM rollback_log WHERE session_id = ?
      ORDER BY timestamp DESC LIMIT 1
    `).get(this.sessionId)

    if (!last) return { ok: false, msg: 'nothing to undo' }

    if (last.existed_before) {
      fs.copyFileSync(last.backup_path, last.original_path)
    } else {
      // Agent created this file — delete it
      if (fs.existsSync(last.original_path)) fs.unlinkSync(last.original_path)
    }

    if (fs.existsSync(last.backup_path)) fs.unlinkSync(last.backup_path)
    this.db.prepare('DELETE FROM rollback_log WHERE id = ?').run(last.id)

    return { ok: true, msg: `restored ${path.relative(this.projectPath, last.original_path)}` }
  }

  /** Reverts ALL changes made in this session. */
  undoAll() {
    const entries = this.db.prepare(`
      SELECT * FROM rollback_log WHERE session_id = ?
      ORDER BY timestamp DESC
    `).all(this.sessionId)

    for (const entry of entries) {
      if (entry.existed_before) {
        if (fs.existsSync(entry.backup_path)) {
          fs.copyFileSync(entry.backup_path, entry.original_path)
        }
      } else {
        if (fs.existsSync(entry.original_path)) fs.unlinkSync(entry.original_path)
      }
      if (fs.existsSync(entry.backup_path)) fs.unlinkSync(entry.backup_path)
    }

    this.db.prepare('DELETE FROM rollback_log WHERE session_id = ?').run(this.sessionId)
    return { ok: true, msg: `restored ${entries.length} file(s)` }
  }

  _nextIndex() {
    const row = this.db.prepare(
      'SELECT COUNT(*) as c FROM rollback_log WHERE session_id = ?'
    ).get(this.sessionId)
    return (row?.c ?? 0) + 1
  }
}
