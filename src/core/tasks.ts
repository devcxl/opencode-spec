import path from "node:path"

import { changeDir, getTemplate, pathExists, renderTemplate, slugify, validateTasksMarkdown, writeText } from "./common.js"
import { toRelativePath } from "./paths.js"

export interface UpdateTasksInput {
  projectDir: string
  name: string
  content?: string
}

/**
 * 更新（或创建）变更的任务文件（tasks.md）
 *
 * 如果未提供 content，则使用模板生成默认的任务列表。
 * 写入前会校验任务格式是否正确（含前置零、重复 ID 等）。
 */
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

  return {
    path: toRelativePath(input.projectDir, filePath),
    paths: [toRelativePath(input.projectDir, filePath)],
    slug,
  }
}
