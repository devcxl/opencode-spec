import { access, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

export const PLUGIN_ID = "opencode-spec"

export const DEFAULT_TEMPLATES = {
  proposal: `# Proposal: {{name}}

## Summary

## Motivation

## Scope

## Non-Goals

## Risks
`,
  design: `# Design: {{name}}

## Overview

## Goals

## Constraints

## Technical Approach

## Alternatives Considered

## Impacted Files / Modules

## Risks and Mitigations
`,
  tasks: `# Tasks: {{name}}

> 任务 ID 必须使用纯数字分段格式，例如 \`1.1\`、\`1.2\`、\`2.1.1\`。
> 不要使用前导零、括号、\`Step 1\`、\`1)\`、\`1-1\` 等格式。

## Implementation
- [ ] 1.1 完成实现

## Verification
- [ ] 2.1 完成验证
`,
  spec: `# Spec: {{name}}

## Requirements

## Behavior

## Acceptance Criteria
`,
} as const

export type TemplateName = keyof typeof DEFAULT_TEMPLATES

export interface ParsedTask {
  id: string
  checked: boolean
  text: string
}

const TASK_LINE_PATTERN = /^- \[( |x)\] (\d+(?:\.\d+)*)\s+(.+)$/
const CHECKBOX_LINE_PATTERN = /^- \[(?: |x)\]/

function hasLeadingZeroSegment(taskId: string) {
  return taskId.split(".").some((segment) => segment.length > 1 && segment.startsWith("0"))
}

function assertNoLeadingZeroTaskId(taskId: string) {
  if (hasLeadingZeroSegment(taskId)) {
    throw new Error(`tasks.md 包含带前导零的任务 ID，请改为 1.1 这类格式：${taskId}`)
  }
}

export function normalizeTaskId(taskId: string) {
  const normalized = taskId.trim()
  if (!/^\d+(?:\.\d+)*$/.test(normalized)) {
    return normalized
  }

  return normalized
    .split(".")
    .map((segment) => String(Number.parseInt(segment, 10)))
    .join(".")
}

export function validateTasksMarkdown(markdown: string) {
  const invalidLines: string[] = []
  const leadingZeroIds: string[] = []
  const normalizedIdToSource = new Map<string, string>()
  const duplicateIds: string[] = []

  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    if (!CHECKBOX_LINE_PATTERN.test(line)) {
      continue
    }

    const match = line.match(TASK_LINE_PATTERN)
    if (!match) {
      invalidLines.push(`${index + 1}: ${line}`)
      continue
    }

    const rawTaskId = match[2]
    if (hasLeadingZeroSegment(rawTaskId)) {
      leadingZeroIds.push(`${index + 1}: ${rawTaskId}`)
      continue
    }

    const normalizedTaskId = normalizeTaskId(rawTaskId)
    const previousSource = normalizedIdToSource.get(normalizedTaskId)
    if (previousSource) {
      duplicateIds.push(`${normalizedTaskId}（${previousSource} / ${index + 1}: ${rawTaskId}）`)
      continue
    }

    normalizedIdToSource.set(normalizedTaskId, `${index + 1}: ${rawTaskId}`)
  }

  if (invalidLines.length) {
    throw new Error(
      `tasks.md 包含不可识别的任务格式，请使用 - [ ] 1.1 任务描述 这种机器任务 ID 格式：${invalidLines.join("；")}`,
    )
  }

  if (leadingZeroIds.length) {
    throw new Error(`tasks.md 包含带前导零的任务 ID，请改为 1.1 这类格式：${leadingZeroIds.join("；")}`)
  }

  if (duplicateIds.length) {
    throw new Error(`tasks.md 包含重复的机器任务 ID：${duplicateIds.join("；")}`)
  }
}

export function normalizeText(content: string) {
  return content.endsWith("\n") ? content : `${content}\n`
}

export async function pathExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

export async function readOptionalText(filePath: string) {
  if (!(await pathExists(filePath))) {
    return null
  }

  return readFile(filePath, "utf8")
}

export async function ensureParentDir(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
}

export async function writeText(filePath: string, content: string) {
  await ensureParentDir(filePath)
  await writeFile(filePath, normalizeText(content), "utf8")
}

export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")

  return slug || "change"
}

export function openspecRoot(projectDir: string) {
  return path.join(projectDir, "openspec")
}

export function changesRoot(projectDir: string) {
  return path.join(openspecRoot(projectDir), "changes")
}

export function archiveRoot(projectDir: string) {
  return path.join(changesRoot(projectDir), "archive")
}

export function specsRoot(projectDir: string) {
  return path.join(openspecRoot(projectDir), "specs")
}

export function changeDir(projectDir: string, name: string) {
  return path.join(changesRoot(projectDir), slugify(name))
}

export function archiveDir(projectDir: string, name: string) {
  return path.join(archiveRoot(projectDir), slugify(name))
}

export async function ensureOpenSpecStructure(projectDir: string) {
  const targets = [specsRoot(projectDir), changesRoot(projectDir), archiveRoot(projectDir)]
  const created: string[] = []

  for (const target of targets) {
    if (!(await pathExists(target))) {
      await mkdir(target, { recursive: true })
      created.push(path.relative(projectDir, target).replace(/\\/g, "/"))
    }
  }

  return created
}

export async function getTemplate(projectDir: string, templateName: TemplateName) {
  const projectTemplatePath = path.join(
    projectDir,
    ".opencode",
    PLUGIN_ID,
    "templates",
    `${templateName}.md`,
  )
  const projectTemplate = await readOptionalText(projectTemplatePath)

  return projectTemplate ?? DEFAULT_TEMPLATES[templateName]
}

export function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, (_match, key: string) => values[key] ?? "")
}

export async function listDirectories(dirPath: string) {
  if (!(await pathExists(dirPath))) {
    return []
  }

  const entries = await readdir(dirPath, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
}

export function parseTasks(markdown: string): ParsedTask[] {
  const tasks: ParsedTask[] = []
  const lines = markdown.split(/\r?\n/)

  for (const line of lines) {
    const match = line.match(TASK_LINE_PATTERN)
    if (!match) {
      continue
    }

    assertNoLeadingZeroTaskId(match[2])

    tasks.push({
      checked: match[1] === "x",
      id: match[2],
      text: match[3],
    })
  }

  return tasks
}

export function markTasksComplete(markdown: string, completeTaskIds: string[]) {
  const requested = new Set(completeTaskIds.map((taskId) => normalizeTaskId(taskId)))
  const found = new Set<string>()

  const content = markdown.replace(/^- \[( |x)\] (\d+(?:\.\d+)*)\s+(.+)$/gm, (line, state, taskId, text) => {
    assertNoLeadingZeroTaskId(taskId)
    const normalizedTaskId = normalizeTaskId(taskId)
    if (!requested.has(normalizedTaskId)) {
      return line
    }

    found.add(normalizedTaskId)
    return `- [x] ${taskId} ${text}`
  })

  const missingTaskIds = completeTaskIds.filter((taskId) => !found.has(normalizeTaskId(taskId)))
  return { content, missingTaskIds }
}

export function appendVerificationNotes(markdown: string, verificationSummary?: string) {
  const note = verificationSummary?.trim()
  if (!note) {
    return markdown
  }

  const item = `- ${note}`
  if (markdown.includes(item)) {
    return markdown
  }

  const normalized = normalizeText(markdown).trimEnd()
  if (normalized.includes("## Verification Notes")) {
    return `${normalized}\n${item}\n`
  }

  return `${normalized}\n\n## Verification Notes\n${item}\n`
}

export async function copyDirectory(sourceDir: string, targetDir: string) {
  const entries = await readdir(sourceDir, { withFileTypes: true })
  await mkdir(targetDir, { recursive: true })

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name)
    const targetPath = path.join(targetDir, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath)
      continue
    }

    await ensureParentDir(targetPath)
    await copyFile(sourcePath, targetPath)
  }
}
