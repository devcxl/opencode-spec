import { readFile } from "node:fs/promises"
import path from "node:path"

import { pathExists } from "../util/fs.js"

export async function loadPrompt(packageRoot: string, projectDir: string, name: string): Promise<string> {
  const projectPath = path.join(projectDir, ".opencode", "opencode-spec", "prompts", `${name}.md`)
  if (await pathExists(projectPath)) {
    return await readFile(projectPath, "utf8")
  }

  const builtinPath = path.join(packageRoot, "assets", "prompts", `${name}.md`)
  if (await pathExists(builtinPath)) {
    return await readFile(builtinPath, "utf8")
  }

  return ""
}
