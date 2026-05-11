import path from "node:path"

import { changeDir, getTemplate, pathExists, renderTemplate, slugify, writeText } from "./common.js"
import { toRelativePath } from "./paths.js"

export interface UpdateDesignInput {
  projectDir: string
  name: string
  content?: string
}

export async function updateDesign(input: UpdateDesignInput) {
  const slug = slugify(input.name)
  const targetDir = changeDir(input.projectDir, slug)
  const filePath = path.join(targetDir, "design.md")

  if (!(await pathExists(targetDir))) {
    throw new Error(`未找到变更 ${slug}`)
  }

  const content =
    input.content ?? renderTemplate(await getTemplate(input.projectDir, "design"), { name: slug, slug })

  await writeText(filePath, content)

  return {
    path: toRelativePath(input.projectDir, filePath),
    paths: [toRelativePath(input.projectDir, filePath)],
    slug,
  }
}
