import { mkdir } from "node:fs/promises"

import { loadProjectConfig } from "./config.js"
import { createChangeMeta, writeChangeMeta } from "./change.js"
import { pathExists } from "./fs.js"
import { changeDir, changeMetaPath, changeSpecsDir, ensureOpenSpecStructure, slugify, toRelativePath } from "./paths.js"

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

  const meta = createChangeMeta({
    name: input.name,
    slug,
    schema: config.schema,
  })
  await writeChangeMeta(input.projectDir, slug, meta)

  return {
    created: [targetDir, specsDir, changeMetaPath(input.projectDir, slug)].map((filePath) => toRelativePath(input.projectDir, filePath)),
    metaPath: toRelativePath(input.projectDir, changeMetaPath(input.projectDir, slug)),
    path: toRelativePath(input.projectDir, targetDir),
    schema: config.schema,
    slug,
  }
}
