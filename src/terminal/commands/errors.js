import * as renderer from '../renderer.js'

export default async function errors(parsed, context) {
  const { db } = context
  if (!db) { renderer.warn('no project open'); return }

  if (parsed.sub === 'list') {
    const rows = db.prepare(
      'SELECT error_type, times_seen, fix_prompt, last_seen FROM error_patterns ORDER BY times_seen DESC'
    ).all()
    if (!rows.length) { renderer.muted('  no error patterns recorded yet'); return }
    renderer.header('KNOWN ERROR PATTERNS')
    renderer.table([
      ['Type', 'Seen', 'Fix', 'Last seen'],
      ...rows.map(r => [
        r.error_type,
        String(r.times_seen),
        (r.fix_prompt ?? '').slice(0, 40),
        new Date(r.last_seen).toLocaleDateString(),
      ]),
    ])
    return
  }

  if (parsed.sub === 'clear') {
    db.prepare('DELETE FROM error_patterns').run()
    renderer.success('  error patterns cleared')
    return
  }

  renderer.error('usage: errors list | errors clear')
}
