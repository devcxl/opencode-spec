import path from "node:path"

import { changeDir, getTemplate, pathExists, renderTemplate, slugify, writeText } from "./common.js"

export interface UpdateDesignInput {
  projectDir: string
  name: string
  content?: string
}

export async function updateDesign(input: UpdateDesignInput) {
  const slug = slugify(input.name)
  const filePath = path.join(changeDir(input.projectDir, slug), "design.md")

  if (!(await pathExists(filePath))) {
    throw new Error(`未找到变更 ${slug} 的 design.md`)
  }

  const content =
    input.content ?? renderTemplate(await getTemplate(input.projectDir, "design"), { name: slug, slug })

  await writeText(filePath, content)

  return {
    path: path.relative(input.projectDir, filePath).replace(/\\/g, "/"),
    slug,
  }
}
