import termKit from 'terminal-kit'

const term = termKit.terminal

/**
 * Displays a y/n question and waits for a single keypress.
 * No Enter required. Returns Promise<boolean>.
 */
export function askYesNo(question) {
  return new Promise((resolve) => {
    term.yellow(`\n  ${question} (y/n): `)

    term.grabInput({ mouse: false })

    term.once('key', (name) => {
      term.grabInput(false)
      const answer = String(name).toLowerCase()
      term(answer + '\n')
      resolve(answer === 'y')
    })
  })
}
