import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { loadPrompt } from "./prompts.js"

let _bootstrapCache: string | undefined

const _fallbackContent = readFileSync(
  path.join(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
    "assets", "prompts", "bootstrap.md"
  ),
  "utf-8"
)

export async function initBootstrap() {
  const content = await loadPrompt("bootstrap")
  _bootstrapCache = content || undefined
}

export function getBootstrapContent(): string {
  return _bootstrapCache ?? _fallbackContent
}

export function resetBootstrap() {
  _bootstrapCache = undefined
}
