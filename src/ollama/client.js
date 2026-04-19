const BASE_URL = 'http://localhost:11434'

/**
 * Streams a chat completion. Calls onToken(chunk) for each token received.
 * Returns the full assembled response string when the stream ends.
 */
export async function chat(model, messages, onToken = null) {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model, messages, stream: true }),
  })

  if (!response.ok) {
    throw new Error(`Ollama chat error: ${response.status} ${response.statusText}`)
  }

  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let   full    = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const lines = decoder.decode(value, { stream: true }).split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const data = JSON.parse(line)
        if (data.message?.content) {
          full += data.message.content
          if (onToken) onToken(data.message.content)
        }
      } catch { /* skip malformed chunks */ }
    }
  }

  return full
}

/**
 * Single-shot generation (no streaming). Used only for summary compression.
 */
export async function generate(model, prompt) {
  const response = await fetch(`${BASE_URL}/api/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model, prompt, stream: false }),
  })

  if (!response.ok) throw new Error(`Ollama generate error: ${response.status}`)
  const data = await response.json()
  return data.response
}

/**
 * Returns the list of locally installed Ollama models.
 */
export async function listModels() {
  const response = await fetch(`${BASE_URL}/api/tags`)
  if (!response.ok) throw new Error('Ollama not reachable')
  const data = await response.json()
  return data.models ?? []
}

/**
 * Generates an embedding for the given text using nomic-embed-text.
 * Returns a float array (~768 dimensions).
 */
export async function embedText(text) {
  const response = await fetch(`${BASE_URL}/api/embeddings`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
  })
  if (!response.ok) throw new Error(`Embedding error: ${response.status}`)
  const data = await response.json()
  return data.embedding
}

/** Quick connectivity check. Returns true if Ollama is reachable. */
export async function isRunning() {
  try {
    const res = await fetch(`${BASE_URL}/api/tags`)
    return res.ok
  } catch {
    return false
  }
}
