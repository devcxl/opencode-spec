import path from "node:path"

import { resolveChangeLocation } from "./change.js"
import { listFilesRecursive, pathExists, readOptionalText } from "./fs.js"
import { parseTasks, validateTasksMarkdown } from "./tasks-format.js"

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
