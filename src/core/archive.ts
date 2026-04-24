import { rename } from "node:fs/promises"
import path from "node:path"

import {
  archiveDir,
  changeDir,
  copyDirectory,
  parseTasks,
  pathExists,
  readOptionalText,
  slugify,
  specsRoot,
} from "./common.js"

export interface ArchiveChangeInput {
  projectDir: string
  name: string
}

export async function archiveChange(input: ArchiveChangeInput) {
  const slug = slugify(input.name)
  const activeDir = changeDir(input.projectDir, slug)
  const targetArchiveDir = archiveDir(input.projectDir, slug)
  const proposalPath = path.join(activeDir, "proposal.md")
  const designPath = path.join(activeDir, "design.md")
  const tasksPath = path.join(activeDir, "tasks.md")
  const specsDir = path.join(activeDir, "specs")

  if (!(await pathExists(activeDir))) {
    throw new Error(`未找到活动变更 ${slug}`)
  }

  for (const required of [proposalPath, designPath, tasksPath, specsDir]) {
    if (!(await pathExists(required))) {
      throw new Error(`归档失败，缺少必要文件：${path.relative(input.projectDir, required).replace(/\\/g, "/")}`)
    }
  }

  const tasksContent = (await readOptionalText(tasksPath)) ?? ""
  const pendingTasks = parseTasks(tasksContent).filter((task) => !task.checked)
  if (pendingTasks.length > 0) {
    throw new Error(`归档失败，仍有未完成任务：${pendingTasks.map((task) => task.id).join(", ")}`)
  }

  if (await pathExists(targetArchiveDir)) {
    throw new Error(`归档目标已存在：${slug}`)
  }

  const targetSpecsDir = path.join(specsRoot(input.projectDir), slug)
  await copyDirectory(specsDir, targetSpecsDir)
  await rename(activeDir, targetArchiveDir)

  return {
    archivedTo: path.relative(input.projectDir, targetArchiveDir).replace(/\\/g, "/"),
    slug,
    specsMergedTo: path.relative(input.projectDir, targetSpecsDir).replace(/\\/g, "/"),
  }
}
