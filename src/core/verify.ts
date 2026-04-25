import { readOptionalText } from "./fs.js"
import { parseTasks } from "./tasks-format.js"
import { validateChange } from "./validate.js"

export interface VerifyChangeInput {
  projectDir: string
  name: string
}

export interface VerifyChangeResult {
  critical: string[]
  pendingTaskIds: string[]
  readyToArchive: boolean
  slug: string
  suggestions: string[]
  warnings: string[]
}

export async function verifyChange(input: VerifyChangeInput): Promise<VerifyChangeResult> {
  const validation = await validateChange({
    projectDir: input.projectDir,
    name: input.name,
    requirePlanningArtifacts: true,
    strict: true,
  })

  const critical = [...validation.errors]
  const warnings = [...validation.warnings]
  const suggestions: string[] = []
  const pendingTaskIds: string[] = []

  if (validation.files.tasks) {
    const content = (await readOptionalText(validation.files.tasks)) ?? ""
    const tasks = parseTasks(content)
    pendingTaskIds.push(...tasks.filter((task) => !task.checked).map((task) => task.id))

    if (pendingTaskIds.length > 0) {
      critical.push(`仍有未完成任务：${pendingTaskIds.join(", ")}`)
    }

    if (!content.includes("## Verification Notes")) {
      warnings.push("缺少 Verification Notes，建议补充验证结果")
      suggestions.push("先通过 openspec-apply 记录 verificationSummary，再归档")
    }
  }

  return {
    critical,
    pendingTaskIds,
    readyToArchive: critical.length === 0,
    slug: validation.slug,
    suggestions,
    warnings,
  }
}
