import path from "node:path"

import { resolveChangeLocation } from "../change/change.js"
import { listFilesRecursive, pathExists, readOptionalText } from "../../util/fs.js"
import { parseTasks, validateTasksMarkdown } from "../../util/tasks-format.js"

export interface ValidateChangeInput {
  projectDir: string
  name: string
  strict?: boolean
  requirePlanningArtifacts?: boolean
}

export interface ValidateChangeResult {
  valid: boolean
  warnings: string[]
  errors: string[]
  files: {
    design: string | null
    proposal: string | null
    specs: string[]
    tasks: string | null
  }
  slug: string
}

/**
 * 校验变更的完整性和正确性
 *
 * 检查项：
 * - proposal.md、design.md、tasks.md 是否存在（strict 模式下缺失视为错误）
 * - specs/ 目录下是否有 .md 文件
 * - tasks.md 格式是否合法（ID 格式、前置零、重复等）
 *
 * strict 模式/requirePlanningArtifacts 模式下，缺失规划制品（proposal、design、specs）视为错误而非警告。
 */
export async function validateChange(input: ValidateChangeInput): Promise<ValidateChangeResult> {
  const location = await resolveChangeLocation(input.projectDir, input.name)
  if (!location) {
    throw new Error(`未找到变更 ${input.name}`)
  }

  const proposalPath = path.join(location.dirPath, "proposal.md")
  const designPath = path.join(location.dirPath, "design.md")
  const tasksPath = path.join(location.dirPath, "tasks.md")
  const specsDir = path.join(location.dirPath, "specs")
  const specs = (await listFilesRecursive(specsDir)).filter((filePath) => filePath.endsWith(".md"))

  const warnings: string[] = []
  const errors: string[] = []
  const treatMissingAsError = input.strict || input.requirePlanningArtifacts

  const checkFile = async (filePath: string, label: string) => {
    if (await pathExists(filePath)) {
      return filePath
    }

    ;(treatMissingAsError ? errors : warnings).push(`缺少 ${label}`)
    return null
  }

  const proposal = await checkFile(proposalPath, "proposal.md")
  const design = await checkFile(designPath, "design.md")
  const tasks = await checkFile(tasksPath, "tasks.md")

  if (specs.length === 0) {
    ;(treatMissingAsError ? errors : warnings).push("缺少 specs/*.md")
  }

  const tasksContent = tasks ? await readOptionalText(tasks) : null
  if (tasksContent) {
    try {
      validateTasksMarkdown(tasksContent)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }

    if (parseTasks(tasksContent).length === 0) {
      warnings.push("tasks.md 中没有可识别的任务项")
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    files: {
      design,
      proposal,
      specs,
      tasks,
    },
    slug: location.slug,
  }
}
