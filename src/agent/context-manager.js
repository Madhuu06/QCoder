import * as ollama from '../ollama/client.js'

// Token budget (approximate: chars / 4)
const BUDGET = {
  total:      8000,
  system:      600,
  ragContext: 1500,
  summary:     400,
  outputRes:  1000,
  recent:     4500,  // = 8000 - 600 - 1500 - 400 - 1000
}

function estimateTokens(text) {
  return Math.ceil((text ?? '').length / 4)
}

/**
 * Applies the sliding window algorithm to the session's message history.
 *
 * Returns { recent: Message[], summary: string | null }
 *
 * If old messages exist and no summary is cached, generates one via the model
 * and saves it to sessions.summary.
 */
export async function buildContextWindow(sessionId, db, model) {
  const allMessages = db.prepare(
    'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
  ).all(sessionId)

  if (allMessages.length === 0) return { recent: [], summary: null }

  const totalTokens = allMessages.reduce(
    (sum, m) => sum + estimateTokens(m.content), 0
  )

  // No compression needed
  if (totalTokens <= BUDGET.recent) {
    return { recent: allMessages, summary: null }
  }

  // Sliding window: walk backwards, fill recent[] until budget fills
  let used   = 0
  const recent = []
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const tokens = estimateTokens(allMessages[i].content)
    if (used + tokens > BUDGET.recent) break
    recent.unshift(allMessages[i])
    used += tokens
  }

  // Old messages = anything not in recent
  const recentIds = new Set(recent.map(m => m.id))
  const old = allMessages.filter(m => !recentIds.has(m.id))

  if (old.length === 0) return { recent, summary: null }

  // Get or generate summary (lazy — cached in sessions.summary)
  const session = db.prepare('SELECT summary FROM sessions WHERE id = ?').get(sessionId)
  let summary = session?.summary ?? null

  if (!summary) {
    const oldText = old.map(m => `${m.role}: ${m.content}`).join('\n')
    summary = await ollama.generate(model,
      `Summarise this conversation history in 4-5 sentences.\n` +
      `Focus on: what task was worked on, what files were modified, ` +
      `what errors were encountered, what was resolved.\n` +
      `Be factual and specific. No commentary or filler.\n\n${oldText}`
    )
    db.prepare('UPDATE sessions SET summary = ? WHERE id = ?').run(summary, sessionId)
  }

  return { recent, summary }
}

/**
 * Builds the messages array to send to Ollama, injecting the summary block
 * and recent history in the correct order.
 */
export function assembleMessages(systemPrompt, summary, recentMessages) {
  const messages = [{ role: 'system', content: systemPrompt }]

  if (summary) {
    messages.push({ role: 'user',      content: `[Previous session summary: ${summary}]` })
    messages.push({ role: 'assistant', content: 'Understood. I will use this context.' })
  }

  for (const msg of recentMessages) {
    messages.push({ role: msg.role, content: msg.content })
  }

  return messages
}
