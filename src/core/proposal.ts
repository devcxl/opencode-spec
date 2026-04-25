import { touchChangeMeta } from "./change.js"
import { changeDir, getTemplate, pathExists, renderTemplate, slugify, writeText } from "./common.js"
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

  const content = input.content ?? renderTemplate(await getTemplate(input.projectDir, "proposal"), { name: slug, slug })
  await writeText(filePath, content)
  await touchChangeMeta(input.projectDir, slug)

  return {
    path: toRelativePath(input.projectDir, filePath),
    paths: [toRelativePath(input.projectDir, filePath)],
    slug,
  }
}
