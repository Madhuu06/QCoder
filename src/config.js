import fs   from 'fs'
import path from 'path'
import os   from 'os'

const CONFIG_DIR  = path.join(os.homedir(), '.qcoder')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

const DEFAULTS = {
  defaultModel:      'qwen2.5-coder:7b',
  defaultTrustLevel: 'medium',
  lastProjectPath:   null,
}

export function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULTS }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveConfig(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function updateConfig(key, value) {
  const config = loadConfig()
  config[key] = value
  saveConfig(config)
  return config
}
