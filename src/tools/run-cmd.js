import { exec } from 'child_process'

// Hardcoded whitelist — non-overridable
const ALLOWED_COMMANDS = [
  'node', 'npm', 'npx',
  'python', 'python3', 'pip', 'pip3',
  'git',
  'ls', 'dir', 'cat', 'type',
  'mkdir', 'touch', 'echo', 'pwd',
]

/**
 * Checks whether the command starts with a whitelisted executable.
 */
function isAllowed(command) {
  const first = command.trim().split(/\s+/)[0].toLowerCase()
  return ALLOWED_COMMANDS.some(allowed => first === allowed || first.endsWith(`/${allowed}`) || first.endsWith(`\\${allowed}`))
}

/**
 * Runs a whitelisted shell command. Times out after run_cmd_timeout_ms (default 30s).
 */
export function runCmd({ command, timeoutMs = 30000 }) {
  if (!isAllowed(command)) {
    return Promise.resolve({
      error: `command not allowed: "${command.split(' ')[0]}". Allowed: ${ALLOWED_COMMANDS.join(', ')}`,
    })
  }

  return new Promise((resolve) => {
    exec(command, { timeout: timeoutMs, shell: true }, (err, stdout, stderr) => {
      if (err && err.killed) {
        resolve({ error: `command timed out after ${timeoutMs / 1000}s` })
        return
      }
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: err?.code ?? 0,
      })
    })
  })
}
