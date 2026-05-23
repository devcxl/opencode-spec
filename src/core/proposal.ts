import { formatProposalWithFrontmatter, readProposalFrontmatter } from "./change.js"
import { changeDir, getTemplate, pathExists, readOptionalText, renderTemplate, slugify, writeText } from "./common.js"
import { proposalPath, toRelativePath } from "./paths.js"

export interface UpdateProposalInput {
  projectDir: string
  name: string
  content?: string
}

/**
 * 更新（或创建）变更的提案文件（proposal.md）
 *
 * 如果文件已存在，保留原有 frontmatter（slug、createdAt）；
 * 如果是新建，则生成新的 frontmatter。
 * 未提供 content 时使用默认模板生成。
 */
export async function updateProposal(input: UpdateProposalInput) {
  const slug = slugify(input.name)
  const targetDir = changeDir(input.projectDir, slug)
  const filePath = proposalPath(input.projectDir, slug)

  if (!(await pathExists(targetDir))) {
    throw new Error(`未找到变更 ${slug}`)
  }

  const existingContent = await readOptionalText(filePath)
  const frontmatter = existingContent == null
    ? { slug, createdAt: new Date().toISOString() }
    : await readProposalFrontmatter(filePath)
  if (frontmatter.slug !== slug) {
    throw new Error(`proposal.md frontmatter slug 与变更目录不一致：${frontmatter.slug} !== ${slug}`)
  }

  const content = input.content ?? renderTemplate(await getTemplate(input.projectDir, "proposal"), { name: slug, slug })
  await writeText(filePath, formatProposalWithFrontmatter(content, frontmatter))

  return {
    path: toRelativePath(input.projectDir, filePath),
    paths: [toRelativePath(input.projectDir, filePath)],
    slug,
  }
}
