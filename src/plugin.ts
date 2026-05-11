import type { Plugin } from "@opencode-ai/plugin"
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

export function resolvePackageRoot(metaUrl: string) {
  return path.resolve(path.dirname(fileURLToPath(metaUrl)), "..")
}

const packageRoot = resolvePackageRoot(import.meta.url)

function extractAndStripFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: {} as Record<string, string>, content }

  const frontmatterStr = match[1]
  const body = match[2]
  const frontmatter: Record<string, string> = {}

  for (const line of frontmatterStr.split("\n")) {
    const colonIdx = line.indexOf(":")
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "")
      frontmatter[key] = value
    }
  }

  return { frontmatter, content: body }
}

interface ParsedCommand {
  name: string
  description?: string
  agent?: string
  model?: string
  subtask?: boolean
  template: string
}

let _commandsCache: { key: string; value: ParsedCommand[] } | undefined

function loadCommands(commandsDir: string, skillsDir: string): ParsedCommand[] {
  const cacheKey = `${commandsDir}:${skillsDir}`
  if (_commandsCache?.key === cacheKey) return _commandsCache.value

  if (!existsSync(commandsDir)) {
    _commandsCache = { key: cacheKey, value: [] }
    return []
  }

  const parsed: ParsedCommand[] = []

  for (const file of readdirSync(commandsDir)) {
    if (!file.endsWith(".md")) continue

    const name = path.basename(file, ".md")
    const raw = readFileSync(path.join(commandsDir, file), "utf8")
    const { frontmatter, content } = extractAndStripFrontmatter(raw)

    const template = content.trim().replaceAll(".opencode/skills/", `${skillsDir}/`)

    parsed.push({
      name,
      description: frontmatter.description,
      agent: frontmatter.agent,
      model: frontmatter.model,
      subtask: frontmatter.subtask === "true" ? true : frontmatter.subtask === "false" ? false : undefined,
      template,
    })
  }

  _commandsCache = { key: cacheKey, value: parsed }
  return parsed
}

let _bootstrapCache: string | undefined

function getBootstrapContent(): string {
  if (_bootstrapCache !== undefined) return _bootstrapCache

  _bootstrapCache = `<EXTREMELY_IMPORTANT>
OpenSpec 工作流已启用。

你可以使用以下 slash commands：
- /opsx-propose <变更名> — 创建完整的 proposal/specs/design/tasks
- /opsx-apply <变更名> — 执行 tasks 实现变更
- /opsx-archive <变更名> — 归档已完成变更
- /opsx-explore <主题> — 需求澄清与方案探索

推荐流程：proposal → specs → design → tasks → apply → archive
</EXTREMELY_IMPORTANT>`

  return _bootstrapCache
}

async function setupSkillsDir(sourceSkillsDir: string): Promise<string> {
  const baseDir = await mkdtemp(path.join(tmpdir(), "opencode-spec-skills-"))
  const destDir = path.join(baseDir, "skills")

  await cp(sourceSkillsDir, destDir, { recursive: true })

  async function processDir(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await processDir(fullPath)
        continue
      }
      if (entry.name === "SKILL.md") {
        let content = await readFile(fullPath, "utf8")
        content = content.replaceAll(".opencode/skills/", `${destDir}/`)
        await writeFile(fullPath, content, "utf8")
      }
    }
  }

  await processDir(destDir)

  process.on("exit", () => {
    rm(baseDir, { recursive: true, force: true }).catch(() => {})
  })

  return destDir
}

export const OpencodeSpec: Plugin = async (ctx) => {
  const sourceSkillsDir = path.join(packageRoot, "assets", "skills")
  const commandsDir = path.join(packageRoot, "assets", "commands")
  const skillsDir = await setupSkillsDir(sourceSkillsDir)

  return {
    config: async (rawConfig) => {
      const config = rawConfig as Record<string, any>

      config.skills = config.skills || {}
      config.skills.paths = config.skills.paths || []
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir)
      }

      config.command = config.command || {}
      for (const cmd of loadCommands(commandsDir, skillsDir)) {
        if (config.command[cmd.name]) continue
        config.command[cmd.name] = {
          template: cmd.template,
          description: cmd.description,
          agent: cmd.agent,
          model: cmd.model,
          subtask: cmd.subtask,
        }
      }
    },

    "experimental.chat.messages.transform": async (_input, output) => {
      const bootstrap = getBootstrapContent()
      if (!output.messages.length) return

      const firstUser = output.messages.find(m => m.info.role === "user")
      if (!firstUser || !firstUser.parts.length) return

      if (firstUser.parts.some(p => p.type === "text" && p.text.includes("EXTREMELY_IMPORTANT"))) return

      firstUser.parts.unshift({ type: "text", text: bootstrap } as typeof firstUser.parts[number])
    },
  }
}
