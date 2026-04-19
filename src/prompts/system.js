import { DONE_TOOL } from '../tools/index.js'

/**
 * Builds the system prompt injected on every Ollama call.
 * memory: string from .qcoder/memory.md (or '')
 * tools:  array of { name, description } from tools/index.js
 * trustLevel: 'low' | 'medium' | 'high'
 */
export function buildSystemPrompt({ memory, tools, trustLevel }) {
  const allTools = [...tools, DONE_TOOL]
  const toolList = allTools.map(t => `- ${t.name}: ${t.description}`).join('\n')

  const trustText = {
    low:    'Every action will be confirmed by the user before execution.',
    medium: 'File writes and commands will be confirmed. Reads are automatic.',
    high:   'Run autonomously. Only pause when you hit an unresolvable error.',
  }[trustLevel] ?? 'File writes and commands will be confirmed. Reads are automatic.'

  const memorySection = memory
    ? `\n## What you already know about this project\n${memory}\nUse this knowledge. Do not re-discover facts already listed here.`
    : ''

  return `You are QCoder, a local AI coding assistant that acts as an autonomous agent.
You help developers by reading, editing, and running code on their local machine.
You must respond with a single JSON object on every turn — nothing else.

## Available tools
Use a tool by responding with exactly this format:
{ "tool": "<tool_name>", "args": { ... } }

When the task is fully complete, respond with:
{ "tool": "done", "args": { "summary": "<one sentence of what was done>" } }

### Tool list
${toolList}

## Rules
- Never read or modify files in: node_modules, .git, .qcoder, or any ignored path
- Never read .env files or any file that may contain secrets
- Always read a file before writing to it — never overwrite blindly
- Plan before acting: think through all steps before the first tool call
- If a command fails, analyse the error — do not repeat the identical call
- Never run destructive shell commands (rm, del, format, sudo, chmod 777)
- Output only what is asked — no explanations unless the user requests them
- One tool call per response — never chain multiple JSON objects

## Trust level: ${trustLevel}
${trustText}${memorySection}`.trim()
}
