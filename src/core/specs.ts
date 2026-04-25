import path from "node:path"

import { touchChangeMeta } from "./change.js"
import { changeDir, getTemplate, pathExists, renderTemplate, slugify, writeText } from "./common.js"
import { changeSpecsDir, toRelativePath } from "./paths.js"

export interface UpdateSpecsInput {
  projectDir: string
  name: string
  content?: string
}

export async function updateSpecs(input: UpdateSpecsInput) {
  const slug = slugify(input.name)
  const targetDir = changeDir(input.projectDir, slug)

  if (!(await pathExists(targetDir))) {
    throw new Error(`未找到变更 ${slug}`)
  }

  const filePath = path.join(changeSpecsDir(input.projectDir, slug), "spec.md")
  const content = input.content ?? renderTemplate(await getTemplate(input.projectDir, "spec"), { name: slug, slug })

  await writeText(filePath, content)
  await touchChangeMeta(input.projectDir, slug)

  return {
    paths: [toRelativePath(input.projectDir, filePath)],
    slug,
  }
}
