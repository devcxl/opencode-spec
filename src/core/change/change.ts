import { readdir, stat } from "node:fs/promises"
import path from "node:path"
import { parse } from "yaml"

import { loadProjectConfig } from "../project/config.js"
import { pathExists, readOptionalText } from "../../util/fs.js"
import {
  archiveRoot,
  archiveChangeDir,
  changeDir,
  slugify,
} from "../../util/paths.js"
import type { ChangeMeta } from "../model/types.js"

/** 变更在磁盘上的位置信息 */
interface ChangeLocation {
  dirPath: string
  slug: string
  status: "active" | "archived"
}

/** Proposal.md 文件头中的元数据结构 */
interface ProposalFrontmatter {
  slug: string
  createdAt: string
}

/** 将字符串转为 YAML 安全的引用字符串 */
function formatYamlString(value: string) {
  return JSON.stringify(value)
}

/**
 * 将 proposal 内容与 frontmatter 元数据重新组装为完整的 .md 文件
 *
 * 如果 content 已包含 frontmatter，会先剥离旧 frontmatter 再包裹新的。
 */
export function formatProposalWithFrontmatter(content: string, frontmatter: ProposalFrontmatter) {
  const body = stripProposalFrontmatter(content)
  return `---\nslug: ${formatYamlString(frontmatter.slug)}\ncreatedAt: ${formatYamlString(frontmatter.createdAt)}\n---\n\n${body}`
}

/**
 * 剥离 proposal.md 文件头中的 frontmatter，只返回正文部分
 *
 * 适用于：在已有 proposal 文件上覆盖更新 frontmatter 的场景。
 */
export function stripProposalFrontmatter(content: string) {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    return content
  }

  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  if (!match) {
    throw new Error("proposal.md frontmatter 缺少结束分隔符 ---")
  }

  return content.slice(match[0].length).replace(/^\r?\n/, "")
}

/**
 * 解析 proposal.md 的 frontmatter，返回 { slug, createdAt }
 *
 * 校验规则：
 * - 必须存在有效的 frontmatter 块
 * - 仅允许 slug 和 createdAt 两个字段
 * - slug 不能为空
 * - createdAt 必须是有效 ISO 日期字符串
 */
export function parseProposalFrontmatter(content: string): ProposalFrontmatter {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    throw new Error("proposal.md 缺少 frontmatter")
  }

  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) {
    throw new Error("proposal.md frontmatter 缺少结束分隔符 ---")
  }

  const parsed = parse(match[1])
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("proposal.md frontmatter 必须是对象")
  }

  const keys = Object.keys(parsed)
  const extraKeys = keys.filter((key) => key !== "slug" && key !== "createdAt")
  if (extraKeys.length > 0) {
    throw new Error(`proposal.md frontmatter 只允许 slug 和 createdAt 字段：${extraKeys.join(", ")}`)
  }

  const { slug, createdAt } = parsed as Record<string, unknown>
  if (typeof slug !== "string" || !slug.trim()) {
    throw new Error("proposal.md frontmatter 缺少有效 slug")
  }

  if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))) {
    throw new Error("proposal.md frontmatter 缺少有效 createdAt")
  }

  return { slug, createdAt }
}

/** 读取文件并解析其中的 proposal frontmatter */
export async function readProposalFrontmatter(filePath: string): Promise<ProposalFrontmatter> {
  const content = await readOptionalText(filePath)
  if (content == null) {
    throw new Error("未找到 proposal.md")
  }

  return parseProposalFrontmatter(content)
}

/**
 * 根据磁盘路径信息推断变更元数据
 *
 * 读取 proposal.md 的文件时间和 frontmatter，
 * 从项目配置获取 schema 名称，组装成完整的 ChangeMeta。
 */
async function inferChangeMetaFromLocation(projectDir: string, slug: string, location: ChangeLocation): Promise<ChangeMeta> {
  const schema = (await loadProjectConfig(projectDir)).schema
  const targetProposalPath = path.join(location.dirPath, "proposal.md")
  const proposalStats = await stat(targetProposalPath)
  const frontmatter = await readProposalFrontmatter(targetProposalPath)
  const archivedAt = location.status === "archived" ? (await stat(location.dirPath)).mtime.toISOString() : undefined

  if (frontmatter.slug !== slug) {
    throw new Error(`proposal.md frontmatter slug 与变更目录不一致：${frontmatter.slug} !== ${slug}`)
  }

  const updatedAt = proposalStats.mtime.toISOString()

  return {
    name: slug,
    slug,
    schema,
    createdAt: frontmatter.createdAt,
    updatedAt,
    ...(archivedAt ? { archivedAt } : {}),
    status: location.status,
  }
}

/**
 * 尝试在归档目录中查找指定 slug 的变更
 *
 * 先在 archive/<slug> 精确匹配，再遍历 archive/ 下所有目录
 * 匹配 <date>-<slug> 格式的带日期前缀的目录。
 */
async function resolveArchivedChangeLocation(projectDir: string, slug: string): Promise<ChangeLocation | null> {
  const archivedDir = archiveChangeDir(projectDir, slug)
  if (await pathExists(archivedDir)) {
    return {
      dirPath: archivedDir,
      slug,
      status: "archived",
    }
  }

  const archivedRootPath = archiveRoot(projectDir)
  if (!(await pathExists(archivedRootPath))) {
    return null
  }

  const entries = await readdir(archivedRootPath, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    if (entry.name === slug || entry.name.endsWith(`-${slug}`)) {
      return {
        dirPath: path.join(archivedRootPath, entry.name),
        slug,
        status: "archived",
      }
    }
  }

  return null
}

/**
 * 根据名称查找变更在磁盘上的位置
 *
 * 先在 active 变更目录中查找，未找到则在归档目录中查找。
 */
export async function resolveChangeLocation(projectDir: string, name: string): Promise<ChangeLocation | null> {
  const slug = slugify(name)
  const activeDir = changeDir(projectDir, slug)
  if (await pathExists(activeDir)) {
    return {
      dirPath: activeDir,
      slug,
      status: "active",
    }
  }

  return resolveArchivedChangeLocation(projectDir, slug)
}

/** 解析变更元数据（包括定位磁盘位置和推断元信息） */
export async function resolveChangeMeta(projectDir: string, name: string): Promise<ChangeMeta> {
  const slug = slugify(name)
  const location = await resolveChangeLocation(projectDir, slug)
  if (!location) {
    throw new Error(`未找到变更 ${slug}`)
  }

  return inferChangeMetaFromLocation(projectDir, slug, location)
}

export type { ChangeLocation }
