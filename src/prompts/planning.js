/**
 * Injected as the last user message before the first model response.
 * Forces the model to output ONLY a numbered list — no code, no prose.
 */
export const PLANNING_PROMPT = `Output ONLY a numbered list of the steps you will take to complete this task.

Rules:
- Each step must be one short line: number, action verb, target file or tool
- No code blocks, no commands, no markdown, no explanations
- Do not execute anything yet — just list the steps
- Do not ask for input or output

Example format:
1. read_file src/index.js
2. write_file src/index.js with fix applied
3. run_cmd node --check src/index.js
4. done`

