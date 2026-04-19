/**
 * Sent to the model when a tool call fails.
 * knownFix: string from error fingerprinting, or null.
 */
export function buildErrorPrompt(toolName, args, error, attempt, maxAttempts, knownFix) {
  const knownFixSection = knownFix
    ? `\nThis error type has been seen before. The fix that worked previously:\n${knownFix}\nApply this fix now.`
    : `\nAnalyse the error carefully. Choose one:
1. Fix the problem and retry with a different approach
2. Read a relevant file first to understand the issue
3. If you cannot resolve this, respond with:
   { "tool": "done", "args": { "summary": "stopped: <reason>" } }

Do not repeat the exact same call that just failed.`

  return `[Step failed — attempt ${attempt}/${maxAttempts}]
Tool: ${toolName}
Args: ${JSON.stringify(args)}
Error: ${error}
${knownFixSection}

Respond with your next tool call.`
}
