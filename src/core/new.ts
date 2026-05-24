import { mkdir } from "node:fs/promises"

import { formatProposalWithFrontmatter } from "./change.js"
import { loadProjectConfig } from "./config.js"
import { pathExists, writeText } from "./fs.js"
import { changeDir, changeSpecsDir, ensureOpenSpecStructure, proposalPath, toRelativePath, validateSlug } from "./paths.js"

export interface CreateChangeScaffoldInput {
  projectDir: string
  name: string
}

/**
 * 创建变更的基础目录结构（脚手架）
 *
 * 在 openspec/changes/ 下创建 <slug>/ 目录和 specs/ 子目录，
 * 并初始化一个空的 proposal.md（仅含 frontmatter 元数据）。
 * 禁止同名变更，冲突时抛出异常。
 */
export async function createChangeScaffold(input: CreateChangeScaffoldInput) {
  await ensureOpenSpecStructure(input.projectDir)

  const slug = validateSlug(input.name)
  const targetDir = changeDir(input.projectDir, slug)
  if (await pathExists(targetDir)) {
    throw new Error(`变更 ${slug} 已存在，请使用不同的名称`)
  }

  const config = await loadProjectConfig(input.projectDir)
  const specsDir = changeSpecsDir(input.projectDir, slug)
  await mkdir(specsDir, { recursive: true })
  const targetProposalPath = proposalPath(input.projectDir, slug)
  await writeText(targetProposalPath, formatProposalWithFrontmatter("", { slug, createdAt: new Date().toISOString() }))

  return {
    created: [targetDir, specsDir, targetProposalPath].map((filePath) => toRelativePath(input.projectDir, filePath)),
    path: toRelativePath(input.projectDir, targetDir),
    schema: config.schema,
    slug,
  }
}
