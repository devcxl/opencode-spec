import path from "node:path"

import { resolveChangeMeta } from "./change.js"
import { archiveRoot, changeDir, changesRoot, listDirectories, parseTasks, readOptionalText, slugify } from "./common.js"
import { toRelativePath } from "./paths.js"
import { verifyChange } from "./verify.js"

/** 变更概要信息 */
export interface ChangeSummary {
  completedTasks: number
  name: string
  path: string
  pendingTasks: number
  schema?: "spec-driven"
  status: "in-progress" | "ready-to-archive" | "archived"
}

export interface ListChangesInput {
  projectDir: string
}

/**
 * 汇总单个变更的状态
 *
 * 读取 tasks.md 的完成任务数和待办任务数，
 * 结合 verifyChange 判断是否可以归档。
 * 已归档的变更直接标记为 archived。
 */
async function summarizeChange(projectDir: string, rootDir: string, name: string, archived = false): Promise<ChangeSummary> {
  const normalizedName = archived ? slugify(name.replace(/^\d{4}-\d{2}-\d{2}-/, "")) : slugify(name)
  const tasksPath = path.join(rootDir, name, "tasks.md")
  const content = (await readOptionalText(tasksPath)) ?? ""
  const tasks = parseTasks(content)
  const completedTasks = tasks.filter((task) => task.checked).length
  const pendingTasks = tasks.filter((task) => !task.checked).length
  const meta = await resolveChangeMeta(projectDir, normalizedName)
  const status: ChangeSummary["status"] = archived
    ? "archived"
    : await verifyChange({ projectDir, name: meta.slug })
        .then((result) => (result.readyToArchive ? "ready-to-archive" : "in-progress"))
        .catch(() => "in-progress")

  return {
    completedTasks,
    name: meta.slug,
    path: toRelativePath(projectDir, path.join(rootDir, name)),
    pendingTasks,
    schema: meta.schema,
    status,
  }
}

/**
 * 列出项目中所有变更及状态
 *
 * 返回活跃变更和已归档变更的列表，
 * 每个变更包含完成任务数、待办任务数和归档就绪状态。
 */
export async function listChanges(input: ListChangesInput) {
  const activeNames = (await listDirectories(changesRoot(input.projectDir))).filter((name) => name !== "archive")
  const archivedNames = await listDirectories(archiveRoot(input.projectDir))

  const active = await Promise.all(activeNames.map((name) => summarizeChange(input.projectDir, changesRoot(input.projectDir), name)))
  const archived = await Promise.all(
    archivedNames.map((name) => summarizeChange(input.projectDir, archiveRoot(input.projectDir), name, true)),
  )

  return { active, archived }
}
