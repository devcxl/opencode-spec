import path from "node:path"

import { archiveRoot, changeDir, changesRoot, listDirectories, parseTasks, readOptionalText, slugify } from "./common.js"

export interface ChangeSummary {
  completedTasks: number
  name: string
  path: string
  pendingTasks: number
  status: "in-progress" | "ready-to-archive" | "archived"
}

export interface ListChangesInput {
  projectDir: string
}

async function summarizeChange(projectDir: string, rootDir: string, name: string, archived = false): Promise<ChangeSummary> {
  const normalizedName = slugify(name)
  const tasksPath = path.join(rootDir, normalizedName, "tasks.md")
  const content = (await readOptionalText(tasksPath)) ?? ""
  const tasks = parseTasks(content)
  const completedTasks = tasks.filter((task) => task.checked).length
  const pendingTasks = tasks.filter((task) => !task.checked).length

  return {
    completedTasks,
    name: normalizedName,
    path: path.relative(projectDir, path.join(rootDir, normalizedName)).replace(/\\/g, "/"),
    pendingTasks,
    status: archived ? "archived" : pendingTasks === 0 ? "ready-to-archive" : "in-progress",
  }
}

export async function listChanges(input: ListChangesInput) {
  const activeNames = (await listDirectories(changesRoot(input.projectDir))).filter((name) => name !== "archive")
  const archivedNames = await listDirectories(archiveRoot(input.projectDir))

  const active = await Promise.all(activeNames.map((name) => summarizeChange(input.projectDir, changesRoot(input.projectDir), name)))
  const archived = await Promise.all(
    archivedNames.map((name) => summarizeChange(input.projectDir, archiveRoot(input.projectDir), name, true)),
  )

  return { active, archived }
}
