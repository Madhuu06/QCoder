const KNOWN_TOOLS = new Set([
  'read_file', 'write_file', 'create_file', 'delete_file',
  'list_files', 'run_cmd', 'save_memory', 'done',
])

/**
 * Parses a raw model response string into a structured tool call.
 *
 * Returns one of:
 *   { type: 'tool', tool: string, args: object }
 *   { type: 'retry', message: string }
 */
export function parse(raw) {
  if (!raw || !raw.trim()) {
    return retry('Empty response received. Respond with a JSON tool call.')
  }

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const stripped = raw
    .replace(/```[a-z]*\n?/gi, '')  // opening fence
    .replace(/```/g, '')             // closing fence
    .trim()

  // 1. Direct parse of stripped text
  let parsed = tryParse(stripped)

  // 2. Extract the outermost {...} block from prose (greedy, not lazy)
  if (!parsed) {
    const start = stripped.indexOf('{')
    const end   = stripped.lastIndexOf('}')
    if (start !== -1 && end > start) parsed = tryParse(stripped.slice(start, end + 1))
  }

  // 3. Try original raw as final fallback
  if (!parsed) {
    const start = raw.indexOf('{')
    const end   = raw.lastIndexOf('}')
    if (start !== -1 && end > start) parsed = tryParse(raw.slice(start, end + 1))
  }

  if (!parsed) {
    return retry(
      'Your response was not valid JSON. Respond only with a JSON tool call.\n' +
      'Example: { "tool": "read_file", "args": { "path": "src/index.js" } }'
    )
  }

  if (typeof parsed.tool !== 'string') {
    return retry('Response is missing a "tool" field. Every response must have { "tool": "...", "args": { ... } }')
  }

  if (!KNOWN_TOOLS.has(parsed.tool)) {
    return retry(
      `Unknown tool: "${parsed.tool}". Valid tools are: ${[...KNOWN_TOOLS].join(', ')}`
    )
  }

  if (typeof parsed.args !== 'object' || parsed.args === null) {
    parsed.args = {}
  }

  return { type: 'tool', tool: parsed.tool, args: parsed.args }
}

function tryParse(str) {
  try { return JSON.parse(str) } catch { return null }
}

function retry(message) {
  return { type: 'retry', message }
}
