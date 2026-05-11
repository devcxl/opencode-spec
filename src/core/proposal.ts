import { formatProposalWithFrontmatter, readProposalFrontmatter } from "./change.js"
import { changeDir, getTemplate, pathExists, readOptionalText, renderTemplate, slugify, writeText } from "./common.js"
import { proposalPath, toRelativePath } from "./paths.js"

export interface UpdateProposalInput {
  projectDir: string
  name: string
  content?: string
}

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
