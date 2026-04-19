import os      from 'os'
import { execSync } from 'child_process'
import { setConfig } from '../db/index.js'

/**
 * Detects total RAM (GB) and whether a GPU (NVIDIA) is present.
 */
export function detectSystemSpecs() {
  const totalRamGb = Math.floor(os.totalmem() / 1e9)

  let hasGpu = false
  try {
    execSync('nvidia-smi', { stdio: 'ignore', timeout: 3000 })
    hasGpu = true
  } catch { /* no NVIDIA GPU — silent */ }

  return { totalRamGb, hasGpu }
}

/**
 * Rule-based model recommendation. GPU presence upgrades one tier.
 */
export function recommendModel(totalRamGb, hasGpu) {
  let model
  if (totalRamGb < 8)        model = 'qwen2.5-coder:3b'
  else if (totalRamGb <= 16) model = 'qwen2.5-coder:7b'
  else                       model = 'qwen2.5-coder:14b'

  // Upgrade one tier when GPU is present
  if (hasGpu) {
    if (model === 'qwen2.5-coder:3b')  model = 'qwen2.5-coder:7b'
    else if (model === 'qwen2.5-coder:7b') model = 'qwen2.5-coder:14b'
  }

  return model
}

/**
 * Detects specs, computes recommendation, saves to system_config, and returns result.
 */
export function scanAndSave() {
  const { totalRamGb, hasGpu } = detectSystemSpecs()
  const model = recommendModel(totalRamGb, hasGpu)

  setConfig('detected_ram_gb',   String(totalRamGb))
  setConfig('detected_gpu',      String(hasGpu))
  setConfig('recommended_model', model)

  return { totalRamGb, hasGpu, recommendedModel: model }
}

/**
 * Estimates VRAM/RAM needed to run a model (rough approximation).
 */
export function estimateModelRam(modelName) {
  if (modelName.includes('3b'))  return 3
  if (modelName.includes('7b'))  return 5
  if (modelName.includes('14b')) return 10
  if (modelName.includes('32b')) return 22
  return 5
}
