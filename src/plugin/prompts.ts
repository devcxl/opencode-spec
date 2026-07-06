import { readFile } from "node:fs/promises"
import path from "node:path"

import { pathExists } from "../util/fs.js"

let _packageRoot = ""
let _projectDir = ""

export function initPrompts(packageRoot: string, projectDir: string) {
  _packageRoot = packageRoot
  _projectDir = projectDir
}

export function resetPrompts() {
  _packageRoot = ""
  _projectDir = ""
}

export async function loadPrompt(name: string): Promise<string> {
  const projectPath = path.join(_projectDir, ".opencode", "opencode-spec", "prompts", `${name}.md`)
  if (await pathExists(projectPath)) {
    return await readFile(projectPath, "utf8")
  }

  const builtinPath = path.join(_packageRoot, "assets", "prompts", `${name}.md`)
  if (await pathExists(builtinPath)) {
    return await readFile(builtinPath, "utf8")
  }

  return ""
}
