import termKit from 'terminal-kit'

const term = termKit.terminal

// In-place progress bar instance (kept module-level so progressBar() can update it)
let _progressBar = null

// ─── Structural ────────────────────────────────────────────────────────────

export function banner(text) {
  term.bold.cyan(`\n  ${text}\n`)
}

export function header(text) {
  divider()
  term.bold.white(`  ${text}\n`)
}

export function divider() {
  term.dim('  ' + '─'.repeat(50) + '\n')
}

// ─── Status lines ──────────────────────────────────────────────────────────

export function success(text) { term.green(`${text}\n`) }
export function error(text)   { term.red(`${text}\n`) }
export function warn(text)    { term.yellow(`${text}\n`) }
export function muted(text)   { term.dim(`${text}\n`) }
export function plan(text)    { term.dim(`    ${text}\n`) }

// ─── Streaming tokens ──────────────────────────────────────────────────────

/** Called per token during streaming. Prints inline (no newline). */
export function token(chunk) { term(chunk) }

// ─── Diff output ───────────────────────────────────────────────────────────

export function diffAdd(text)    { term.green(`+ ${text}\n`) }
export function diffRemove(text) { term.red(`- ${text}\n`) }

/** Shows a simple line-by-line diff between original and modified text. */
export function showDiff(original, modified) {
  const origLines = (original ?? '').split('\n')
  const newLines  = (modified  ?? '').split('\n')
  const maxLen    = Math.max(origLines.length, newLines.length)

  divider()
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i]
    const n = newLines[i]
    if      (o === undefined) diffAdd(n)
    else if (n === undefined) diffRemove(o)
    else if (o !== n)         { diffRemove(o); diffAdd(n) }
    else                      { term.dim(`  ${o}\n`) }
  }
  divider()
}

// ─── Table ─────────────────────────────────────────────────────────────────

/** Renders a 2D array as a formatted table using terminal-kit. */
export function table(rows) {
  if (!rows || rows.length === 0) { muted('  (empty)'); return }
  term.table(rows, {
    hasBorder:           true,
    contentHasMarkup:    false,
    borderChars:         'lightRounded',
    borderAttr:          { color: 'grey' },
    textAttr:            { bgColor: 'default' },
    firstCellTextAttr:   { bold: false },
    width:               Math.min(process.stdout.columns || 80, 100),
    fit:                 true,
  })
  term('\n')
}

// ─── Progress bar ──────────────────────────────────────────────────────────

/**
 * Updates (or creates) an in-place progress bar.
 * Call with current=total to finalise and clean up.
 */
export function progressBar(current, total) {
  if (!_progressBar) {
    _progressBar = term.progressBar({
      width:   60,
      percent: true,
      eta:     true,
      title:   '  Indexing',
    })
  }
  _progressBar.update(total > 0 ? current / total : 0)
  if (current >= total) {
    _progressBar.stop()
    _progressBar = null
    term('\n')
  }
}
