/**
 * Normalises a raw error string into a structural fingerprint
 * by stripping file paths, line numbers, variable names, and addresses.
 * Two errors of the same type will produce the same fingerprint even if
 * they occur in different files or at different line numbers.
 */
export function fingerprintError(raw) {
  return raw
    .replace(/['"`][^'"`]{1,80}['"`]/g, "'<name>'")      // quoted identifiers
    .replace(/[A-Za-z]:[/\\][\w./\\-]+\.(js|ts|py|json)/g, '<file>') // Windows paths
    .replace(/\/[\w./\\-]+\.(js|ts|py|json)/g, '<file>') // Unix paths
    .replace(/:\d+:\d+/g, ':<line>')                      // line:col numbers
    .replace(/\bat\s+<file>/g, 'at <file>')               // clean up "at <file>"
    .replace(/0x[0-9a-f]+/gi, '<addr>')                   // hex addresses
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Looks up a known fix for the given raw error string.
 * Increments times_seen and updates last_seen on a hit.
 * Returns the fix_prompt string, or null if not known.
 */
export function checkKnownError(db, rawError) {
  if (!db || !rawError) return null
  const fp  = fingerprintError(rawError)
  const row = db.prepare('SELECT * FROM error_patterns WHERE fingerprint = ?').get(fp)
  if (!row) return null

  db.prepare(
    'UPDATE error_patterns SET times_seen = times_seen + 1, last_seen = ? WHERE fingerprint = ?'
  ).run(Date.now(), fp)

  return row.fix_prompt
}

/**
 * Saves a successful fix description for a given raw error string.
 * Uses INSERT OR REPLACE so this is idempotent.
 */
export function saveErrorFix(db, rawError, fixDescription) {
  if (!db || !rawError) return
  const fp        = fingerprintError(rawError)
  const errorType = rawError.split(':')[0].trim()

  db.prepare(`
    INSERT OR REPLACE INTO error_patterns (fingerprint, error_type, fix_prompt, times_seen, last_seen)
    VALUES (?, ?, ?, 1, ?)
  `).run(fp, errorType, fixDescription, Date.now())
}
