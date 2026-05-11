import { mkdir } from "node:fs/promises"

import { formatProposalWithFrontmatter } from "./change.js"
import { loadProjectConfig } from "./config.js"
import { pathExists, writeText } from "./fs.js"
import { changeDir, changeSpecsDir, ensureOpenSpecStructure, proposalPath, slugify, toRelativePath } from "./paths.js"

export interface CreateChangeScaffoldInput {
  projectDir: string
  name: string
}

export async function createChangeScaffold(input: CreateChangeScaffoldInput) {
  await ensureOpenSpecStructure(input.projectDir)

  const slug = slugify(input.name)
  const targetDir = changeDir(input.projectDir, slug)
  if (await pathExists(targetDir)) {
    throw new Error(`变更 ${slug} 已存在`)
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
