import type { Plugin } from "@opencode-ai/plugin"
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getOpenspecDir, setOpenspecDir } from "./core/paths.js"

/** 根据 import.meta.url 解析插件包的根目录路径 */
export function resolvePackageRoot(metaUrl: string) {
  return path.resolve(path.dirname(fileURLToPath(metaUrl)), "..")
}

/** 插件包的根目录 */
const packageRoot = resolvePackageRoot(import.meta.url)

/**
 * 解析并剥离 Markdown 文件的 frontmatter
 *
 * Frontmatter 是位于文件开头的 --- 包裹的 YAML 格式元数据，
 * 例如：---\ntitle: foo\n---\n正文内容
 */
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

/** 解析后的 slash command 结构 */
interface ParsedCommand {
  name: string
  description?: string
  agent?: string
  model?: string
  subtask?: boolean
  template: string
}

/** commands 缓存，避免重复读取磁盘 */
let _commandsCache: { key: string; value: ParsedCommand[] } | undefined

/**
 * 从 commandsDir 加载所有 slash command
 *
 * 遍历目录下的所有 .md 文件，解析 frontmatter 获取命令的元数据，
 * 并将 skills 路径替换为运行时动态创建的 skills 目录。
 */
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

/** bootstrap 消息缓存 */
let _bootstrapCache: string | undefined

/**
 * 生成每次对话注入的 bootstrap 提示消息
 *
 * 该消息告知用户 OpenSpec 工作流已启用以及可用的 slash command。
 */
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

/**
 * 在临时目录中复制并处理 skills 目录
 *
 * SKILL.md 中的路径占位符 .opencode/skills/ 会被替换为实际的临时目录路径。
 * 进程退出时自动清理临时目录。
 */
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

/**
 * OpenSpec 插件工厂函数
 *
 * @param ctx - OpenCode 插件上下文
 * @param options - 插件配置选项，支持 `directory` 字段自定义输出目录（默认 "openspec"）
 *
 * 注册两个钩子：
 * 1. config - 在启动时注入 skills 路径和 slash commands，并读取 openspec.directory 配置
 * 2. experimental.chat.messages.transform - 在每条用户消息前插入 bootstrap 提示
 */
export const OpencodeSpec: Plugin = async (ctx, options) => {
  if (options?.directory && typeof options.directory === "string" && options.directory.trim()) {
    const dir = options.directory.trim()
    setOpenspecDir(dir)
    process.env.OPENSPEC_DIR = dir
  }

  const sourceSkillsDir = path.join(packageRoot, "assets", "skills")
  const commandsDir = path.join(packageRoot, "assets", "commands")
  const skillsDir = await setupSkillsDir(sourceSkillsDir)

  return {
    /**
     * 配置钩子：将 OpenSpec 的 skills 目录和 slash commands 注入到 OpenCode 配置中
     */
    config: async (rawConfig) => {
      const config = rawConfig as Record<string, any>

      if (getOpenspecDir() === "openspec") {
        const openspecConfig = config.openspec as Record<string, any> | undefined
        if (openspecConfig?.directory && typeof openspecConfig.directory === "string" && openspecConfig.directory.trim()) {
          const dir = openspecConfig.directory.trim()
          setOpenspecDir(dir)
          process.env.OPENSPEC_DIR = dir
        }
      }

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

    /**
     * 消息转换钩子：在第一条用户消息前插入 bootstrap 提示
     *
     * 如果 bootstrap 已存在（如已被其他插件或历史注入），则跳过。
     */
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
