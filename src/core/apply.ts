import path from "node:path"

import { touchChangeMeta } from "./change.js"
import {
  appendVerificationNotes,
  changeDir,
  markTasksComplete,
  parseTasks,
  readOptionalText,
  slugify,
  writeText,
} from "./common.js"
import { toRelativePath } from "./paths.js"

export interface PrepareApplyInput {
  projectDir: string
  name: string
  completeTaskIds?: string[]
  verificationSummary?: string
}

export async function prepareApply(input: PrepareApplyInput) {
  const slug = slugify(input.name)
  const filePath = path.join(changeDir(input.projectDir, slug), "tasks.md")
  const current = await readOptionalText(filePath)

  if (!current) {
    throw new Error(`未找到变更 ${slug} 的 tasks.md`)
  }

  let nextContent = current
  let missingTaskIds: string[] = []

  if (input.completeTaskIds?.length) {
    const updated = markTasksComplete(nextContent, input.completeTaskIds)
    nextContent = updated.content
    missingTaskIds = updated.missingTaskIds
  }

  nextContent = appendVerificationNotes(nextContent, input.verificationSummary)

  if (nextContent !== current) {
    await writeText(filePath, nextContent)
    await touchChangeMeta(input.projectDir, slug)
  }

  const tasks = parseTasks(nextContent)

  return {
    completedTaskIds: tasks.filter((task) => task.checked).map((task) => task.id),
    missingTaskIds,
    path: toRelativePath(input.projectDir, filePath),
    pendingTaskIds: tasks.filter((task) => !task.checked).map((task) => task.id),
    slug,
    tasks,
  }
}
