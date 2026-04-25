import path from "node:path"

import { touchChangeMeta } from "./change.js"
import { changeDir, getTemplate, pathExists, renderTemplate, slugify, validateTasksMarkdown, writeText } from "./common.js"
import { toRelativePath } from "./paths.js"

export interface UpdateTasksInput {
  projectDir: string
  name: string
  content?: string
}

export async function updateTasks(input: UpdateTasksInput) {
  const slug = slugify(input.name)
  const targetDir = changeDir(input.projectDir, slug)
  const filePath = path.join(targetDir, "tasks.md")

  if (!(await pathExists(targetDir))) {
    throw new Error(`未找到变更 ${slug}`)
  }

  const content = input.content ?? renderTemplate(await getTemplate(input.projectDir, "tasks"), { name: slug, slug })
  validateTasksMarkdown(content)
  await writeText(filePath, content)
  await touchChangeMeta(input.projectDir, slug)

  return {
    path: toRelativePath(input.projectDir, filePath),
    paths: [toRelativePath(input.projectDir, filePath)],
    slug,
  }
}
