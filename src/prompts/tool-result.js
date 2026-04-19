/**
 * Wraps the result of a tool execution before feeding it back to the model.
 */
export function buildToolResultPrompt(toolName, args, result, stepNum, totalSteps) {
  const resultStr = typeof result === 'string'
    ? result
    : JSON.stringify(result, null, 2)

  return `[Step ${stepNum}/${totalSteps} complete] Tool: ${toolName}

Result:
${resultStr}

Continue with the next step in your plan.
If this result reveals something unexpected, write "REVISED PLAN:" before proceeding.
Respond with your next tool call.`
}
