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
    const match = line.match(/^- \[( |x)\] (\d+(?:\.\d+)*)\s+(.+)$/)
    if (!match) {
      continue
    }

    tasks.push({
      checked: match[1] === "x",
      id: match[2],
      text: match[3],
    })
  }

  return tasks
}

export function markTasksComplete(markdown: string, completeTaskIds: string[]) {
  const requested = new Set(completeTaskIds)
  const found = new Set<string>()

  const content = markdown.replace(/^- \[( |x)\] (\d+(?:\.\d+)*)\s+(.+)$/gm, (line, state, taskId, text) => {
    if (!requested.has(taskId)) {
      return line
    }

    found.add(taskId)
    return `- [x] ${taskId} ${text}`
  })

  const missingTaskIds = completeTaskIds.filter((taskId) => !found.has(taskId))
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
