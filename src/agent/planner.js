import * as ollama    from '../ollama/client.js'
import * as renderer   from '../terminal/renderer.js'
import { PLANNING_PROMPT } from '../prompts/planning.js'

export async function plan(enrichedTask, { model }) {
  const messages = [
    {
      role:    'user',
      content: `${enrichedTask}\n\n${PLANNING_PROMPT}`,
    },
  ]

  // Show spinner while planning
  renderer.spinnerTick('Planning...')
  const planTimer = setInterval(() => renderer.spinnerTick('Planning...'), 120)

  const planText = await ollama.chat(model, messages, null)

  clearInterval(planTimer)
  renderer.clearSpinner()

  // Display only the clean numbered steps
  const planLines = planText
    .split('\n')
    .filter(l => /^\s*\d+\./.test(l))
    .map(l => l.trim())

  if (planLines.length > 0) {
    renderer.divider()
    for (const line of planLines) {
      renderer.plan(line)
    }
    renderer.divider()
  } else {
    renderer.muted('  (proceeding without a structured plan)')
  }

  return planText
}

