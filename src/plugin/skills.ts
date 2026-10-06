import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { Skill } from "@opencode/plugin"
import { parse as parseYaml } from "yaml"

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

/** Keep script execution scoped to the workspace even when a skill is invoked directly. */
export function renderScriptCalls(content: string, skillsDir: string, directory: string): string {
  const escapedDir = skillsDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const scriptCall = new RegExp(`node (${escapedDir}/[^\\r\\n]*?\\.js)(?=[\\s\x60"']|$)`, "g")
  return content.replace(scriptCall, (_match, scriptPath: string) =>
    `OPENSPEC_DIR=${shellQuote(directory)} node ${shellQuote(scriptPath)}`,
  )
}

export async function cleanupSkillsDir(skillsDir: string): Promise<void> {
  await rm(path.dirname(skillsDir), { recursive: true, force: true })
}

/**
 * 将插件内置 skills 复制到临时目录，并把 SKILL.md 中的 `.opencode/skills/`
 * 相对路径改写为临时目录的绝对路径，供其中的参考脚本通过相对路径访问。
 *
 * 同时复制内置 templates，供参考脚本通过相对路径读取。
 */
export async function setupSkillsDir(sourceSkillsDir: string, sourceTemplatesDir: string, directory: string): Promise<string> {
  const baseDir = await mkdtemp(path.join(tmpdir(), "opencode-spec-skills-"))
  const destDir = path.join(baseDir, "skills")

  try {
    const destTemplatesDir = path.join(baseDir, "templates")
    await cp(sourceSkillsDir, destDir, { recursive: true })
    await cp(sourceTemplatesDir, destTemplatesDir, { recursive: true })

    async function processDir(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await processDir(fullPath)
          continue
        }
        if (entry.name === "SKILL.md") {
          const content = await readFile(fullPath, "utf8")
          const rendered = renderScriptCalls(content.replaceAll(".opencode/skills/", `${destDir}/`), destDir, directory)
          await writeFile(fullPath, rendered, "utf8")
        }
      }
    }

    await processDir(destDir)
    return destDir
  } catch (error) {
    try {
      await cleanupSkillsDir(destDir)
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Skill setup and cleanup failed")
    }
    throw error
  }
}

/** 递归收集目录下所有名为 SKILL.md 的文件 */
async function collectSkillFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSkillFiles(fullPath)))
      continue
    }
    if (entry.name === "SKILL.md") files.push(fullPath)
  }
  return files
}

/** 解析 Markdown frontmatter，返回 YAML 数据与剥离 frontmatter 后的正文 */
function splitFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!match) return { data: {}, body: raw }
  try {
    const parsed = parseYaml(match[1])
    const data = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
    return { data, body: match[2] }
  } catch {
    return { data: {}, body: raw }
  }
}

/** 读取 frontmatter metadata 中的 `opencode/autoinvoke` 布尔开关 */
function readAutoinvoke(metadata: unknown): boolean | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined
  const value = (metadata as Record<string, unknown>)["opencode/autoinvoke"]
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }
  return undefined
}

/** 映射到上游 OpenSpec 官方技能目录名的别名 */
export const SKILL_ALIASES: Record<string, string> = {
  "openspec-apply": "openspec-apply-change",
  "openspec-archive": "openspec-archive-change",
}

/**
 * 从已部署的 skills 目录加载 V2 Skill.Info 列表。
 *
 * frontmatter 解析与 id/name/description/autoinvoke 推导对齐 OpenCode
 * `SkillFile.parse`，保证插件注册的 skill 与内置目录 skill 语义一致。
 * 同时注册上游标准别名（如 openspec-apply-change、openspec-archive-change）。
 */
export async function loadSkills(skillsDir: string): Promise<Skill.Info[]> {
  const files = (await collectSkillFiles(skillsDir)).sort()
  const skills: Skill.Info[] = []

  for (const file of files) {
    const raw = await readFile(file, "utf8")
    const { data, body } = splitFrontmatter(raw)

    const id = path.basename(path.dirname(file))
    const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : id
    const description = typeof data.description === "string" ? data.description : undefined
    const autoinvoke = readAutoinvoke(data.metadata)

    skills.push(
      Skill.Info.make({
        id: Skill.ID.make(id),
        name: Skill.Name.make(name),
        ...(description === undefined ? {} : { description }),
        ...(autoinvoke === undefined ? {} : { autoinvoke }),
        path: file as Skill.Info["path"],
        content: body,
      }),
    )

    const alias = SKILL_ALIASES[id]
    if (alias) {
      skills.push(
        Skill.Info.make({
          id: Skill.ID.make(alias),
          name: Skill.Name.make(alias),
          ...(description === undefined ? {} : { description }),
          ...(autoinvoke === undefined ? {} : { autoinvoke }),
          path: file as Skill.Info["path"],
          content: body,
        }),
      )
    }
  }

  return skills
}
