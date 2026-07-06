import { readFile } from "node:fs/promises"
import path from "node:path"

import { pathExists } from "../util/fs.js"

let _packageRoot = ""
let _projectDir = ""

export function initPrompts(packageRoot: string, projectDir: string) {
  _packageRoot = packageRoot
  _projectDir = projectDir
}

const DEFAULT_PROMPTS: Record<string, string> = {
  bootstrap: `<EXTREMELY_IMPORTANT>
OpenSpec 工作流已启用。

你可以使用以下 slash commands：
- /opsx-propose <变更名> — 创建完整的 proposal/specs/design/tasks
- /opsx-apply <变更名> — 执行 tasks 实现变更
- /opsx-archive <变更名> — 归档已完成变更
- /opsx-explore <主题> — 需求澄清与方案探索

推荐流程：proposal → specs → design → tasks → apply → archive
</EXTREMELY_IMPORTANT>`,
}

function getDefaultPrompt(name: string): string {
  return DEFAULT_PROMPTS[name] ?? ""
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

  return getDefaultPrompt(name)
}
