import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"

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
export interface ParsedCommand {
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
export function loadCommands(commandsDir: string, skillsDir: string): ParsedCommand[] {
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
