import path from "node:path"

import {
  appendVerificationNotes,
  changeDir,
  markTasksComplete,
  parseTasks,
  readOptionalText,
  slugify,
  writeText,
} from "../../util/common.js"
import { toRelativePath } from "../../util/paths.js"

export interface PrepareApplyInput {
  projectDir: string
  name: string
  completeTaskIds?: string[]
  verificationSummary?: string
}

/**
 * 执行变更的实现步骤（apply）
 *
 * 功能：
 * 1. 将指定的一组任务标记为已完成
 * 2. 追加验证备注到 tasks.md 末尾
 * 3. 返回当前任务的完成情况
 *
 * 仅当内容实际变化时才写入磁盘。
 */
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
