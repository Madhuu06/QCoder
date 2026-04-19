/**
 * Injected as the last user message before the first model response.
 * Forces the model to write a numbered plan before calling any tool.
 */
export const PLANNING_PROMPT = `Before calling any tool, write your plan as a numbered list.
Format exactly like this:

PLAN:
1. [action] [target file or command]
2. [action] [target file or command]
...

Then immediately execute step 1 by responding with its tool call.
After each tool result you receive, execute the next step.
Do not add steps that were not in your original plan.
If a result forces a change of plan, write "REVISED PLAN:" and the new list before continuing.`
