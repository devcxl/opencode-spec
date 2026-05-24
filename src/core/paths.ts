import { mkdir } from "node:fs/promises"
import path from "node:path"

import { pathExists } from "./fs.js"

/** OpenSpec 输出目录名，默认为 "openspec"，可通过插件 options 自定义 */
let _openspecDir = "openspec"

/** 设置 OpenSpec 输出目录名 */
export function setOpenspecDir(dir: string) {
  const trimmed = dir.trim()
  if (!trimmed) throw new Error("OpenSpec 目录名不能为空")
  _openspecDir = trimmed
}

/** 获取当前 OpenSpec 输出目录名 */
export function getOpenspecDir() {
  return _openspecDir
}

/** OpenSpec 插件的唯一标识 */
export const PLUGIN_ID = "opencode-spec"

const MAX_SLUG_LENGTH = 60

/**
 * 将字符串转换为 URL 友好的 slug
 *
 * 规则：小写、去除非字母数字字符、连字符化、去首尾连字符、合并连续连字符。
 * 长度截断到 60 字符。
 */
export function slugify(value: string) {
  let slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")

  if (slug.length > MAX_SLUG_LENGTH) {
    const sliced = slug.slice(0, MAX_SLUG_LENGTH)
    const lastDash = sliced.lastIndexOf("-")
    slug = lastDash > MAX_SLUG_LENGTH / 2 ? sliced.slice(0, lastDash) : sliced
  }

  return slug || "change"
}

/**
 * 验证并生成变更 slug
 *
 * 严格校验输入必须是合理的英文 kebab-case 短语：
 * - 禁止非 ASCII 字符（中文、日文、韩文等），必须翻译为英文
 * - slug 中至少含一个连字符（至少两个单词）
 * - slug 中字母数字字符至少 4 个
 */
export function validateSlug(value: string) {
  const hasNonAscii = /[^\x00-\x7F]/.test(value)
  if (hasNonAscii) {
    throw new Error("变更名必须为英文 kebab-case 短语，请将中文翻译为英文后再试")
  }

  const slug = slugify(value)
  const alphaChars = slug.replace(/[^a-z0-9]/g, "")

  if (alphaChars.length < 4) {
    throw new Error(`变更名过于简洁（"${slug}"），请使用更具体的英文短语，例如 "add-user-auth" 而非 "add-auth"`)
  }

  if (!slug.includes("-")) {
    throw new Error(`变更名至少需要 2 个单词（"${slug}"），请使用更具体的英文短语`)
  }

  return slug
}

/** 将绝对路径转换为相对于项目目录的路径（使用正斜杠） */
export function toRelativePath(projectDir: string, targetPath: string) {
  return path.relative(projectDir, targetPath).replace(/\\/g, "/")
}

/** OpenSpec 根目录：项目根下的 openspec/（目录名可通过 setOpenspecDir 自定义） */
export function openspecRoot(projectDir: string) {
  return path.join(projectDir, _openspecDir)
}

/** 变更目录：openspec/changes/ */
export function changesRoot(projectDir: string) {
  return path.join(openspecRoot(projectDir), "changes")
}

/** 归档变更目录：openspec/changes/archive/ */
export function archiveRoot(projectDir: string) {
  return path.join(changesRoot(projectDir), "archive")
}

/** 全局 spec 目录：openspec/specs/，用于存放已归档变更的最终 spec */
export function specsRoot(projectDir: string) {
  return path.join(openspecRoot(projectDir), "specs")
}

/** 某个变更的目录：openspec/changes/<slug>/ */
export function changeDir(projectDir: string, name: string) {
  return path.join(changesRoot(projectDir), slugify(name))
}

/** 归档变更的目录（无日期前缀）：openspec/changes/archive/<slug>/ */
export function archiveChangeDir(projectDir: string, name: string) {
  return path.join(archiveRoot(projectDir), slugify(name))
}

/** 带日期前缀的归档目录：openspec/changes/archive/<YYYY-MM-DD>-<slug>/ */
export function datedArchiveChangeDir(projectDir: string, name: string, archivedAt: Date | string) {
  const datePrefix = typeof archivedAt === "string" ? archivedAt.slice(0, 10) : archivedAt.toISOString().slice(0, 10)
  return path.join(archiveRoot(projectDir), `${datePrefix}-${slugify(name)}`)
}

/** 变更的 proposal.md 路径 */
export function proposalPath(projectDir: string, name: string) {
  return path.join(changeDir(projectDir, name), "proposal.md")
}

/** 变更的 design.md 路径 */
export function designPath(projectDir: string, name: string) {
  return path.join(changeDir(projectDir, name), "design.md")
}

/** 变更的 tasks.md 路径 */
export function tasksPath(projectDir: string, name: string) {
  return path.join(changeDir(projectDir, name), "tasks.md")
}

/** 变更的 specs 子目录：openspec/changes/<slug>/specs/ */
export function changeSpecsDir(projectDir: string, name: string) {
  return path.join(changeDir(projectDir, name), "specs")
}

/** 用户自定义模板目录：.opencode/opencode-spec/templates/ */
export function pluginTemplateDir(projectDir: string) {
  return path.join(projectDir, ".opencode", PLUGIN_ID, "templates")
}

/** 项目配置文件路径：openspec/config.yaml */
export function projectConfigPath(projectDir: string) {
  return path.join(openspecRoot(projectDir), "config.yaml")
}

/**
 * 确保 OpenSpec 目录结构存在，如果缺失则创建
 *
 * 创建的目录包括：openspec/specs/、openspec/changes/、openspec/changes/archive/
 * 返回实际创建的相对路径列表。
 */
export async function ensureOpenSpecStructure(projectDir: string) {
  const targets = [specsRoot(projectDir), changesRoot(projectDir), archiveRoot(projectDir)]
  const created: string[] = []

  for (const target of targets) {
    if (!(await pathExists(target))) {
      await mkdir(target, { recursive: true })
      created.push(toRelativePath(projectDir, target))
    }
  }

  return created
}
