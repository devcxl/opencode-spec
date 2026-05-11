import { readdir, stat } from "node:fs/promises"
import path from "node:path"
import { parse } from "yaml"

import { loadProjectConfig } from "./config.js"
import { pathExists, readOptionalText } from "./fs.js"
import {
  archiveRoot,
  archiveChangeDir,
  changeDir,
  slugify,
} from "./paths.js"
import type { ChangeMeta } from "./types.js"

interface ChangeLocation {
  dirPath: string
  slug: string
  status: "active" | "archived"
}

interface ProposalFrontmatter {
  slug: string
  createdAt: string
}

function formatYamlString(value: string) {
  return JSON.stringify(value)
}

export function formatProposalWithFrontmatter(content: string, frontmatter: ProposalFrontmatter) {
  const body = stripProposalFrontmatter(content)
  return `---\nslug: ${formatYamlString(frontmatter.slug)}\ncreatedAt: ${formatYamlString(frontmatter.createdAt)}\n---\n\n${body}`
}

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

export async function readProposalFrontmatter(filePath: string): Promise<ProposalFrontmatter> {
  const content = await readOptionalText(filePath)
  if (content == null) {
    throw new Error("未找到 proposal.md")
  }

  return parseProposalFrontmatter(content)
}

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

export async function resolveChangeMeta(projectDir: string, name: string): Promise<ChangeMeta> {
  const slug = slugify(name)
  const location = await resolveChangeLocation(projectDir, slug)
  if (!location) {
    throw new Error(`未找到变更 ${slug}`)
  }

  return inferChangeMetaFromLocation(projectDir, slug, location)
}

export type { ChangeLocation }
