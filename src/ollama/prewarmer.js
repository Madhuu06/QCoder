const BASE_URL = 'http://localhost:11434'

/**
 * Sends a silent one-token request to force Ollama to load the model file
 * into the OS page cache. By the time the user types their first task,
 * the model weights are already warm in RAM — eliminating cold-start latency.
 *
 * Called on startup with no await — runs entirely in the background.
 * Never throws (failures are swallowed silently).
 *
 * @param {string} model   - The Ollama model name to warm
 * @param {number} [keepAliveMs=600000] - How long Ollama keeps the model loaded (default 10 min)
 */
export async function prewarmModel(model, keepAliveMs = 600_000) {
  try {
    await fetch(`${BASE_URL}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages:   [{ role: 'user', content: '.' }],
        stream:     false,
        keep_alive: `${Math.floor(keepAliveMs / 1000)}s`,
        options: {
          num_predict: 1,   // generate exactly one token then stop
          temperature: 0,   // deterministic, no sampling overhead
        },
      }),
    })
  } catch {
    // Ollama not running or model not found — health check handles that separately
  }
}

/**
 * Sets keep_alive to 0 — tells Ollama to immediately unload the model
 * from RAM after the current request. Frees memory when the user is done.
 *
 * @param {string} model
 */
export async function releaseModel(model) {
  try {
    await fetch(`${BASE_URL}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages:   [{ role: 'user', content: '.' }],
        stream:     false,
        keep_alive: '0',
        options: { num_predict: 1, temperature: 0 },
      }),
    })
  } catch { /* silent */ }
}
