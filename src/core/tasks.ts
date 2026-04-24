import path from "node:path"

import { changeDir, getTemplate, pathExists, renderTemplate, slugify, writeText } from "./common.js"

export interface UpdateTasksInput {
  projectDir: string
  name: string
  content?: string
}

export async function updateTasks(input: UpdateTasksInput) {
  const slug = slugify(input.name)
  const filePath = path.join(changeDir(input.projectDir, slug), "tasks.md")

  if (!(await pathExists(filePath))) {
    throw new Error(`未找到变更 ${slug} 的 tasks.md`)
  }

  const content = input.content ?? renderTemplate(await getTemplate(input.projectDir, "tasks"), { name: slug, slug })
  await writeText(filePath, content)

  return {
    path: path.relative(input.projectDir, filePath).replace(/\\/g, "/"),
    slug,
  }
}
