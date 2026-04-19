import * as ollama    from '../ollama/client.js'
import * as renderer   from '../terminal/renderer.js'
import { PLANNING_PROMPT } from '../prompts/planning.js'

/**
 * Sends the task + planning prompt to the model and extracts the plan text.
 * Streams tokens to the terminal via renderer.token.
 * Returns the full raw plan text (to be prepended to conversation history).
 */
export async function plan(enrichedTask, { model, onToken }) {
  const messages = [
    {
      role:    'user',
      content: `${enrichedTask}\n\n${PLANNING_PROMPT}`,
    },
  ]

  renderer.muted('\n  Planning...')

  const planText = await ollama.chat(model, messages, onToken ?? renderer.token)

  // Extract and display the numbered steps
  const planLines = planText
    .split('\n')
    .filter(l => /^\s*\d+\./.test(l))

  if (planLines.length > 0) {
    renderer.divider()
    for (const line of planLines) {
      renderer.plan(line.trim())
    }
    renderer.divider()
  }

  return planText
}
