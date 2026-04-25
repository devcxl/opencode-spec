import { access, copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..")

const DEFAULT_TEMPLATES = {
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
}

const SCHEMA = {
  applyRequires: ["tasks"],
  artifacts: [
    { id: "proposal", requires: [], outputPaths: ["proposal.md"] },
    { id: "specs", requires: ["proposal"], outputPaths: ["specs/**/*.md"] },
    { id: "design", requires: ["proposal"], outputPaths: ["design.md"] },
    { id: "tasks", requires: ["specs", "design"], outputPaths: ["tasks.md"] },
  ],
  name: "spec-driven",
}

const TASK_LINE_PATTERN = /^- \[( |x)\] (\d+(?:\.\d+)*)\s+(.+)$/
const CHECKBOX_LINE_PATTERN = /^- \[(?: |x)\]/

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function unquoteYamlValue(raw) {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ""
  }

  if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed.slice(1, -1)
    }
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'")
  }

  if (trimmed === "true") {
    return true
  }

  if (trimmed === "false") {
    return false
  }

  if (trimmed === "null" || trimmed === "~") {
    return undefined
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed)
  }

  return trimmed
}

function parseSimpleDocument(raw) {
  const text = raw.trim()
  if (!text) {
    return {}
  }

  try {
    const parsed = JSON.parse(text)
    if (isObject(parsed)) {
      return parsed
    }
  } catch {
    // noop
  }

  const result = {}

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#") || /^\s/.test(line)) {
      continue
    }

    const match = line.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/)
    if (!match) {
      continue
    }

    result[match[1]] = unquoteYamlValue(match[2] ?? "")
  }

  return result
}

function formatSimpleValue(value) {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return JSON.stringify(String(value ?? ""))
}

function stringifySimpleDocument(record) {
  return `${Object.entries(record)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${formatSimpleValue(value)}`)
    .join("\n")}\n`
}

function getArtifactDefinition(artifactId) {
  const artifact = SCHEMA.artifacts.find((item) => item.id === artifactId)
  if (!artifact) {
    throw new Error(`未找到 artifact 定义：${artifactId}`)
  }

  return artifact
}

function hasLeadingZeroSegment(taskId) {
  return taskId.split(".").some((segment) => segment.length > 1 && segment.startsWith("0"))
}

function assertNoLeadingZeroTaskId(taskId) {
  if (hasLeadingZeroSegment(taskId)) {
    throw new Error(`tasks.md 包含带前导零的任务 ID，请改为 1.1 这类格式：${taskId}`)
  }
}

function artifactTemplateName(artifactId) {
  return artifactId === "specs" ? "spec" : artifactId
}

function artifactInstruction(artifactId) {
  switch (artifactId) {
    case "proposal":
      return "根据需求补全 proposal，说明变更目标、动机、范围、非目标与风险。"
    case "specs":
      return "根据 proposal 提炼需求与验收标准，必要时拆成多个 specs/*.md。"
    case "design":
      return "根据 proposal 与 specs 补全设计方案、约束、取舍与影响范围。"
    case "tasks":
      return "根据 specs 与 design 拆出可执行、可验证、带机器任务 ID 的任务项。"
    default:
      return "补全 artifact 内容。"
  }
}

export function slugify(value) {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")

  return slug || "change"
}

export function toRelativePath(baseDir, targetPath) {
  return path.relative(baseDir, targetPath).replace(/\\/g, "/")
}

export function normalizeTaskId(taskId) {
  const normalized = taskId.trim()
  if (!/^\d+(?:\.\d+)*$/.test(normalized)) {
    return normalized
  }

  return normalized
    .split(".")
    .map((segment) => String(Number.parseInt(segment, 10)))
    .join(".")
}

export function validateTasksMarkdown(markdown) {
  const invalidLines = []
  const leadingZeroIds = []
  const normalizedIdToSource = new Map()
  const duplicateIds = []

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

  if (invalidLines.length > 0) {
    throw new Error(`tasks.md 包含不可识别的任务格式，请使用 - [ ] 1.1 任务描述：${invalidLines.join("；")}`)
  }

  if (leadingZeroIds.length > 0) {
    throw new Error(`tasks.md 包含带前导零的任务 ID：${leadingZeroIds.join("；")}`)
  }

  if (duplicateIds.length > 0) {
    throw new Error(`tasks.md 包含重复的机器任务 ID：${duplicateIds.join("；")}`)
  }
}

export function parseTasks(markdown) {
  const tasks = []

  for (const line of markdown.split(/\r?\n/)) {
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

export function markTasksComplete(markdown, completeTaskIds) {
  const requested = new Set(completeTaskIds.map((taskId) => normalizeTaskId(taskId)))
  const found = new Set()

  const content = markdown.replace(/^- \[( |x)\] (\d+(?:\.\d+)*)\s+(.+)$/gm, (line, _state, taskId, text) => {
    assertNoLeadingZeroTaskId(taskId)
    const normalizedTaskId = normalizeTaskId(taskId)
    if (!requested.has(normalizedTaskId)) {
      return line
    }

    found.add(normalizedTaskId)
    return `- [x] ${taskId} ${text}`
  })

  return {
    content,
    missingTaskIds: completeTaskIds.filter((taskId) => !found.has(normalizeTaskId(taskId))),
  }
}

export function appendVerificationNotes(markdown, verificationSummary) {
  const note = verificationSummary?.trim()
  if (!note) {
    return markdown
  }

  const item = `- ${note}`
  if (markdown.includes(item)) {
    return markdown
  }

  const normalized = markdown.endsWith("\n") ? markdown.trimEnd() : markdown
  if (normalized.includes("## Verification Notes")) {
    return `${normalized}\n${item}\n`
  }

  return `${normalized}\n\n## Verification Notes\n${item}\n`
}

export async function pathExists(targetPath) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

export async function readOptionalText(filePath) {
  if (!(await pathExists(filePath))) {
    return null
  }

  return readFile(filePath, "utf8")
}

export async function ensureParentDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true })
}

export async function writeText(filePath, content) {
  await ensureParentDir(filePath)
  await writeFile(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8")
}

export async function listDirectories(dirPath) {
  if (!(await pathExists(dirPath))) {
    return []
  }

  const entries = await readdir(dirPath, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
}

export async function listFilesRecursive(dirPath) {
  if (!(await pathExists(dirPath))) {
    return []
  }

  const entries = await readdir(dirPath, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        return listFilesRecursive(entryPath)
      }

      return [entryPath]
    }),
  )

  return files.flat().sort((left, right) => left.localeCompare(right))
}

export async function copyDirectory(sourceDir, targetDir) {
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

export function openspecRoot(projectDir = projectRoot) {
  return path.join(projectDir, process.env.OPENSPEC_DIR || "openspec")
}

export function changesRoot(projectDir = projectRoot) {
  return path.join(openspecRoot(projectDir), "changes")
}

export function archiveRoot(projectDir = projectRoot) {
  return path.join(changesRoot(projectDir), "archive")
}

export function specsRoot(projectDir = projectRoot) {
  return path.join(openspecRoot(projectDir), "specs")
}

export function changeDir(projectDir = projectRoot, name) {
  return path.join(changesRoot(projectDir), slugify(name))
}

export function changeSpecsDir(projectDir = projectRoot, name) {
  return path.join(changeDir(projectDir, name), "specs")
}

export function changeMetaPath(projectDir = projectRoot, name) {
  return path.join(changeDir(projectDir, name), ".openspec.yaml")
}

export function changeMetaPathForDir(dirPath) {
  return path.join(dirPath, ".openspec.yaml")
}

export function proposalPath(projectDir = projectRoot, name) {
  return path.join(changeDir(projectDir, name), "proposal.md")
}

export function designPath(projectDir = projectRoot, name) {
  return path.join(changeDir(projectDir, name), "design.md")
}

export function tasksPath(projectDir = projectRoot, name) {
  return path.join(changeDir(projectDir, name), "tasks.md")
}

export function pluginTemplateDir(projectDir = projectRoot) {
  return path.join(projectDir, ".opencode", "opencode-spec", "templates")
}

export function projectConfigPath(projectDir = projectRoot) {
  return path.join(openspecRoot(projectDir), "config.yaml")
}

export function datedArchiveChangeDir(projectDir = projectRoot, name, archivedAt) {
  const datePrefix = typeof archivedAt === "string" ? archivedAt.slice(0, 10) : archivedAt.toISOString().slice(0, 10)
  return path.join(archiveRoot(projectDir), `${datePrefix}-${slugify(name)}`)
}

export async function ensureOpenSpecStructure(projectDir = projectRoot) {
  const targets = [specsRoot(projectDir), changesRoot(projectDir), archiveRoot(projectDir)]

  for (const target of targets) {
    await mkdir(target, { recursive: true })
  }
}

export async function readProjectConfig(projectDir = projectRoot) {
  const raw = await readOptionalText(projectConfigPath(projectDir))
  const parsed = parseSimpleDocument(raw ?? "")
  const schema = typeof parsed.schema === "string" && parsed.schema.trim() ? parsed.schema.trim() : SCHEMA.name

  if (schema !== SCHEMA.name) {
    throw new Error(`openspec/config.yaml 指定了暂不支持的 schema：${schema}`)
  }

  return { schema }
}

export async function readChangeMetaFromPath(projectDir, filePath) {
  const raw = await readOptionalText(filePath)
  if (!raw?.trim()) {
    return null
  }

  const parsed = parseSimpleDocument(raw)
  if (!isObject(parsed)) {
    throw new Error("变更 metadata 必须是对象")
  }

  const slug = typeof parsed.slug === "string" && parsed.slug.trim() ? slugify(parsed.slug) : undefined
  if (!slug) {
    throw new Error("变更 metadata 缺少 slug")
  }

  const config = await readProjectConfig(projectDir)
  return {
    archivedAt: typeof parsed.archivedAt === "string" && parsed.archivedAt.trim() ? parsed.archivedAt : undefined,
    createdAt: typeof parsed.createdAt === "string" && parsed.createdAt.trim() ? parsed.createdAt : new Date(0).toISOString(),
    name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : slug,
    schema: typeof parsed.schema === "string" && parsed.schema.trim() ? parsed.schema : config.schema,
    slug,
    status: parsed.status === "archived" ? "archived" : parsed.status === "active" ? "active" : undefined,
    updatedAt: typeof parsed.updatedAt === "string" && parsed.updatedAt.trim()
      ? parsed.updatedAt
      : typeof parsed.createdAt === "string" && parsed.createdAt.trim()
        ? parsed.createdAt
        : new Date(0).toISOString(),
  }
}

export function createChangeMeta({ name, slug, schema = SCHEMA.name, now = new Date() }) {
  const timestamp = now.toISOString()

  return {
    createdAt: timestamp,
    name,
    schema,
    slug: slugify(slug),
    status: "active",
    updatedAt: timestamp,
  }
}

export async function writeChangeMetaAtPath(filePath, meta) {
  await writeText(
    filePath,
    stringifySimpleDocument({
      archivedAt: meta.archivedAt,
      createdAt: meta.createdAt,
      name: meta.name,
      schema: meta.schema,
      slug: meta.slug,
      status: meta.status,
      updatedAt: meta.updatedAt,
    }),
  )
}

async function inferChangeMetaFromLocation(projectDir, slug, location) {
  const directoryStats = await stat(location.dirPath)
  const { schema } = await readProjectConfig(projectDir)
  const createdAt = directoryStats.birthtime.toISOString()
  const updatedAt = directoryStats.mtime.toISOString()

  return {
    archivedAt: location.status === "archived" ? updatedAt : undefined,
    createdAt,
    name: slug,
    schema,
    slug,
    status: location.status,
    updatedAt,
  }
}

async function resolveArchivedChangeLocation(projectDir, slug) {
  const archivedRoot = archiveRoot(projectDir)
  if (!(await pathExists(archivedRoot))) {
    return null
  }

  const entries = await readdir(archivedRoot, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const dirPath = path.join(archivedRoot, entry.name)
    const metaPath = changeMetaPathForDir(dirPath)
    const meta = await readChangeMetaFromPath(projectDir, metaPath)
    if (meta?.slug === slug || entry.name === slug || entry.name.endsWith(`-${slug}`)) {
      return {
        dirPath,
        metaPath,
        slug,
        status: "archived",
      }
    }
  }

  return null
}

export async function resolveChangeLocation(projectDir = projectRoot, name) {
  const slug = slugify(name)
  const activeDir = changeDir(projectDir, slug)
  if (await pathExists(activeDir)) {
    return {
      dirPath: activeDir,
      metaPath: changeMetaPath(projectDir, slug),
      slug,
      status: "active",
    }
  }

  return resolveArchivedChangeLocation(projectDir, slug)
}

export async function resolveChangeMeta(projectDir = projectRoot, name) {
  const slug = slugify(name)
  const location = await resolveChangeLocation(projectDir, slug)
  if (!location) {
    throw new Error(`未找到变更 ${slug}`)
  }

  const meta = await readChangeMetaFromPath(projectDir, location.metaPath)
  if (meta) {
    return {
      ...meta,
      status: location.status,
    }
  }

  return inferChangeMetaFromLocation(projectDir, slug, location)
}

export async function touchChangeMeta(projectDir = projectRoot, name, updates = {}, now = new Date()) {
  const location = await resolveChangeLocation(projectDir, name)
  if (!location) {
    return null
  }

  const current = (await readChangeMetaFromPath(projectDir, location.metaPath))
    ?? (await inferChangeMetaFromLocation(projectDir, location.slug, location))

  const next = {
    ...current,
    ...updates,
    status: updates.status ?? location.status,
    updatedAt: now.toISOString(),
  }

  await writeChangeMetaAtPath(location.metaPath, next)
  return next
}

export async function getTemplate(projectDir = projectRoot, templateName) {
  const templatePath = path.join(pluginTemplateDir(projectDir), `${templateName}.md`)
  const projectTemplate = await readOptionalText(templatePath)
  return projectTemplate ?? DEFAULT_TEMPLATES[templateName]
}

export function renderTemplate(template, values) {
  return template.replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, (_match, key) => values[key] ?? "")
}

function globPatternToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&")
  const doubleStarNormalized = escaped.replace(/\*\*\//g, "(?:.*/)?")
  const singleStarNormalized = doubleStarNormalized.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*")
  return new RegExp(`^${singleStarNormalized}$`)
}

async function matchOutputPath(projectDir, baseDir, outputPath) {
  if (!outputPath.includes("*")) {
    const filePath = path.join(baseDir, outputPath)
    return (await pathExists(filePath)) ? [toRelativePath(projectDir, filePath)] : []
  }

  const matcher = globPatternToRegExp(outputPath)
  const files = await listFilesRecursive(baseDir)
  return files
    .filter((filePath) => matcher.test(toRelativePath(baseDir, filePath)))
    .map((filePath) => toRelativePath(projectDir, filePath))
}

function artifactTargetPaths(projectDir, slug, artifactId) {
  const baseDir = changeDir(projectDir, slug)

  switch (artifactId) {
    case "proposal":
      return [toRelativePath(projectDir, path.join(baseDir, "proposal.md"))]
    case "specs":
      return [toRelativePath(projectDir, path.join(baseDir, "specs", "spec.md"))]
    case "design":
      return [toRelativePath(projectDir, path.join(baseDir, "design.md"))]
    case "tasks":
      return [toRelativePath(projectDir, path.join(baseDir, "tasks.md"))]
    default:
      return []
  }
}

export async function detectArtifactPaths(projectDir = projectRoot, name, artifactId) {
  const location = await resolveChangeLocation(projectDir, name)
  if (!location) {
    throw new Error(`未找到变更 ${slugify(name)}`)
  }

  const definition = getArtifactDefinition(artifactId)
  const matched = await Promise.all(definition.outputPaths.map((outputPath) => matchOutputPath(projectDir, location.dirPath, outputPath)))
  return [...new Set(matched.flat())].sort((left, right) => left.localeCompare(right))
}

export async function getArtifactStatus(projectDir = projectRoot, name, artifactId) {
  const existingPaths = await detectArtifactPaths(projectDir, name, artifactId)
  if (existingPaths.length > 0) {
    return {
      existingPaths,
      id: artifactId,
      missingDeps: [],
      state: "done",
    }
  }

  const definition = getArtifactDefinition(artifactId)
  const depStatuses = await Promise.all(definition.requires.map((depId) => detectArtifactPaths(projectDir, name, depId)))
  const missingDeps = definition.requires.filter((_, index) => depStatuses[index]?.length === 0)

  return {
    existingPaths,
    id: artifactId,
    missingDeps,
    state: missingDeps.length > 0 ? "blocked" : "ready",
  }
}

export async function getChangeStatus(projectDir = projectRoot, name) {
  const meta = await resolveChangeMeta(projectDir, name)
  const artifacts = await Promise.all(SCHEMA.artifacts.map((artifact) => getArtifactStatus(projectDir, meta.slug, artifact.id)))
  const applyReady = SCHEMA.applyRequires.every((artifactId) => artifacts.find((artifact) => artifact.id === artifactId)?.state === "done")

  return {
    allArtifactsComplete: artifacts.every((artifact) => artifact.state === "done"),
    applyReady,
    applyRequires: [...SCHEMA.applyRequires],
    artifacts,
    schema: meta.schema,
    schemaName: meta.schema,
    slug: meta.slug,
  }
}

export async function createChangeScaffold(projectDir = projectRoot, name) {
  await ensureOpenSpecStructure(projectDir)

  const slug = slugify(name)
  const targetDir = changeDir(projectDir, slug)
  if (await pathExists(targetDir)) {
    throw new Error(`变更 ${slug} 已存在`)
  }

  const { schema } = await readProjectConfig(projectDir)
  const specsDir = changeSpecsDir(projectDir, slug)
  await mkdir(specsDir, { recursive: true })

  const meta = createChangeMeta({ name, schema, slug })
  await writeChangeMetaAtPath(changeMetaPath(projectDir, slug), meta)

  return {
    created: [targetDir, specsDir, changeMetaPath(projectDir, slug)].map((filePath) => toRelativePath(projectDir, filePath)),
    metaPath: toRelativePath(projectDir, changeMetaPath(projectDir, slug)),
    path: toRelativePath(projectDir, targetDir),
    schema,
    slug,
  }
}

export async function getArtifactInstructions(projectDir = projectRoot, name, artifactId) {
  const meta = await resolveChangeMeta(projectDir, name)
  const status = await getArtifactStatus(projectDir, meta.slug, artifactId)
  const definition = getArtifactDefinition(artifactId)
  const templateName = artifactTemplateName(artifactId)
  const template = renderTemplate(await getTemplate(projectDir, templateName), { name: meta.slug, slug: meta.slug })

  const dependencies = await Promise.all(
    definition.requires.map(async (depId) => {
      const paths = await detectArtifactPaths(projectDir, meta.slug, depId)
      const files = await Promise.all(
        paths.map(async (relativePath) => ({
          content: (await readOptionalText(path.join(projectDir, relativePath))) ?? "",
          path: relativePath,
        })),
      )

      return {
        artifact: depId,
        files,
      }
    }),
  )

  const targetPaths = artifactTargetPaths(projectDir, meta.slug, artifactId)

  return {
    artifact: artifactId,
    context: "",
    dependencies,
    instruction: artifactInstruction(artifactId),
    missingDeps: status.missingDeps,
    outputPath: targetPaths[0] ?? "",
    rules: "",
    schema: meta.schema,
    schemaName: meta.schema,
    state: status.state,
    targetPaths,
    template,
  }
}

export async function prepareApply(projectDir = projectRoot, name) {
  const meta = await resolveChangeMeta(projectDir, name)
  const tasksStatus = await getArtifactStatus(projectDir, meta.slug, "tasks")
  if (tasksStatus.state !== "done") {
    return {
      contextFiles: [],
      instruction: "先补齐 proposal/specs/design/tasks 等 planning artifacts，再开始实现。",
      progress: { complete: 0, remaining: 0, total: 0 },
      reason: tasksStatus.state === "blocked"
        ? `tasks artifact 仍缺少依赖：${tasksStatus.missingDeps.join(", ")}`
        : "尚未生成 tasks.md",
      schema: meta.schema,
      schemaName: meta.schema,
      state: "blocked",
      tasks: [],
    }
  }

  const taskFilePath = path.join(projectDir, artifactTargetPaths(projectDir, meta.slug, "tasks")[0])
  const content = (await readOptionalText(taskFilePath)) ?? ""
  validateTasksMarkdown(content)

  const tasks = parseTasks(content)
  if (tasks.length === 0) {
    return {
      contextFiles: [],
      instruction: "tasks.md 中没有可识别的机器任务项，先补充任务列表。",
      progress: { complete: 0, remaining: 0, total: 0 },
      reason: "tasks.md 中没有可识别的机器任务项",
      schema: meta.schema,
      schemaName: meta.schema,
      state: "blocked",
      tasks: [],
    }
  }

  const specFiles = await detectArtifactPaths(projectDir, meta.slug, "specs")
  const contextFiles = [
    ...artifactTargetPaths(projectDir, meta.slug, "proposal"),
    ...specFiles,
    ...artifactTargetPaths(projectDir, meta.slug, "design"),
    ...artifactTargetPaths(projectDir, meta.slug, "tasks"),
  ].filter(Boolean)

  const complete = tasks.filter((task) => task.checked).length
  const remainingTasks = tasks.filter((task) => !task.checked)

  return {
    contextFiles,
    instruction: remainingTasks.length > 0
      ? `优先从任务 ${remainingTasks[0].id} 开始，完成后立刻回写 tasks.md。`
      : "所有任务都已完成，可以准备归档。",
    progress: {
      complete,
      remaining: remainingTasks.length,
      total: tasks.length,
    },
    schema: meta.schema,
    schemaName: meta.schema,
    state: remainingTasks.length === 0 ? "all_done" : "in_progress",
    tasks,
  }
}

export async function markChangeTasks(projectDir = projectRoot, name, completeTaskIds = [], verificationSummary) {
  const meta = await resolveChangeMeta(projectDir, name)
  const filePath = tasksPath(projectDir, meta.slug)
  const current = (await readOptionalText(filePath)) ?? ""
  if (!current) {
    throw new Error("未找到 tasks.md")
  }

  validateTasksMarkdown(current)
  const { content, missingTaskIds } = markTasksComplete(current, completeTaskIds)
  if (missingTaskIds.length > 0) {
    throw new Error(`未找到任务 ID：${missingTaskIds.join(", ")}`)
  }

  const nextContent = appendVerificationNotes(content, verificationSummary)
  if (nextContent !== current) {
    await writeText(filePath, nextContent)
    await touchChangeMeta(projectDir, meta.slug)
  }

  const tasks = parseTasks(nextContent)
  const pendingTaskIds = tasks.filter((task) => !task.checked).map((task) => task.id)

  return {
    allComplete: pendingTaskIds.length === 0,
    completedTaskIds: tasks.filter((task) => task.checked).map((task) => task.id),
    path: toRelativePath(projectDir, filePath),
    pendingTaskIds,
    progress: {
      complete: tasks.filter((task) => task.checked).length,
      remaining: pendingTaskIds.length,
      total: tasks.length,
    },
    slug: meta.slug,
    tasks,
  }
}

export async function validateChange(projectDir = projectRoot, name, options = {}) {
  const location = await resolveChangeLocation(projectDir, name)
  if (!location) {
    throw new Error(`未找到变更 ${slugify(name)}`)
  }

  const proposal = proposalPath(projectDir, location.slug)
  const design = designPath(projectDir, location.slug)
  const tasks = tasksPath(projectDir, location.slug)
  const specsDir = path.join(location.dirPath, "specs")
  const specs = (await listFilesRecursive(specsDir)).filter((filePath) => filePath.endsWith(".md"))

  const warnings = []
  const errors = []
  const treatMissingAsError = options.strict || options.requirePlanningArtifacts

  const checkFile = async (filePath, label) => {
    if (await pathExists(filePath)) {
      return filePath
    }

    ;(treatMissingAsError ? errors : warnings).push(`缺少 ${label}`)
    return null
  }

  const checkedProposal = await checkFile(proposal, "proposal.md")
  const checkedDesign = await checkFile(design, "design.md")
  const checkedTasks = await checkFile(tasks, "tasks.md")

  if (specs.length === 0) {
    ;(treatMissingAsError ? errors : warnings).push("缺少 specs/*.md")
  }

  const tasksContent = checkedTasks ? await readOptionalText(checkedTasks) : null
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
    errors,
    files: {
      design: checkedDesign,
      proposal: checkedProposal,
      specs,
      tasks: checkedTasks,
    },
    slug: location.slug,
    valid: errors.length === 0,
    warnings,
  }
}

export async function verifyChange(projectDir = projectRoot, name) {
  const validation = await validateChange(projectDir, name, { requirePlanningArtifacts: true, strict: true })
  const critical = [...validation.errors]
  const warnings = [...validation.warnings]
  const suggestions = []
  const pendingTaskIds = []

  if (validation.files.tasks) {
    const content = (await readOptionalText(validation.files.tasks)) ?? ""
    const tasks = parseTasks(content)
    pendingTaskIds.push(...tasks.filter((task) => !task.checked).map((task) => task.id))

    if (pendingTaskIds.length > 0) {
      critical.push(`仍有未完成任务：${pendingTaskIds.join(", ")}`)
    }

    if (!content.includes("## Verification Notes")) {
      warnings.push("缺少 Verification Notes，建议补充验证结果")
      suggestions.push("先通过 mark-tasks.js 追加 verification summary，再归档")
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

export async function syncChangeSpecs(projectDir = projectRoot, name) {
  const validation = await validateChange(projectDir, name, { strict: true })
  const location = await resolveChangeLocation(projectDir, validation.slug)
  if (!location) {
    throw new Error(`未找到变更 ${validation.slug}`)
  }

  const sourceDir = path.join(location.dirPath, "specs")
  const specFiles = await listFilesRecursive(sourceDir)
  const syncedFiles = []

  for (const filePath of specFiles.filter((filePath) => filePath.endsWith(".md"))) {
    const relativePath = toRelativePath(sourceDir, filePath)
    const targetPath = path.join(specsRoot(projectDir), validation.slug, relativePath)
    const content = await readFile(filePath, "utf8")
    await writeText(targetPath, content)
    syncedFiles.push(toRelativePath(projectDir, targetPath))
  }

  return {
    slug: validation.slug,
    syncedFiles,
  }
}

export async function archiveChange(projectDir = projectRoot, name) {
  const slug = slugify(name)
  const activeDir = changeDir(projectDir, slug)
  if (!(await pathExists(activeDir))) {
    throw new Error(`未找到活动变更 ${slug}`)
  }

  const verification = await verifyChange(projectDir, slug)
  if (!verification.readyToArchive) {
    throw new Error(`归档失败：${verification.critical.join("；")}`)
  }

  const syncResult = await syncChangeSpecs(projectDir, slug)
  const meta = await resolveChangeMeta(projectDir, slug)
  const archivedAt = new Date()
  const targetDir = datedArchiveChangeDir(projectDir, slug, archivedAt)

  if (await pathExists(targetDir)) {
    throw new Error(`归档目标已存在：${path.basename(targetDir)}`)
  }

  await mkdir(archiveRoot(projectDir), { recursive: true })
  await rename(activeDir, targetDir)
  await writeChangeMetaAtPath(changeMetaPathForDir(targetDir), {
    ...meta,
    archivedAt: archivedAt.toISOString(),
    status: "archived",
    updatedAt: archivedAt.toISOString(),
  })

  return {
    archivedTo: toRelativePath(projectDir, targetDir),
    change: slug,
    schema: meta.schema,
    schemaName: meta.schema,
    slug,
    specsMergedTo: syncResult.syncedFiles,
    success: true,
    warnings: verification.warnings,
  }
}

export async function listChanges(projectDir = projectRoot) {
  const summarizeChange = async (rootDir, name, archived = false) => {
    const tasksFilePath = path.join(rootDir, name, "tasks.md")
    const tasksContent = (await readOptionalText(tasksFilePath)) ?? ""
    const tasks = parseTasks(tasksContent)
    const completedTasks = tasks.filter((task) => task.checked).length
    const pendingTasks = tasks.filter((task) => !task.checked).length
    const meta = await resolveChangeMeta(projectDir, archived ? name.replace(/^\d{4}-\d{2}-\d{2}-/, "") : name)

    let status = archived ? "archived" : "in-progress"
    if (!archived) {
      try {
        status = (await verifyChange(projectDir, meta.slug)).readyToArchive ? "ready-to-archive" : "in-progress"
      } catch {
        status = "in-progress"
      }
    }

    return {
      completedTasks,
      name: meta.slug,
      path: toRelativePath(projectDir, path.join(rootDir, name)),
      pendingTasks,
      schema: meta.schema,
      status,
    }
  }

  const activeNames = (await listDirectories(changesRoot(projectDir))).filter((name) => name !== "archive")
  const archivedNames = await listDirectories(archiveRoot(projectDir))

  return {
    active: await Promise.all(activeNames.map((name) => summarizeChange(changesRoot(projectDir), name))),
    archived: await Promise.all(archivedNames.map((name) => summarizeChange(archiveRoot(projectDir), name, true))),
  }
}

export function getArgValue(flagName, args = process.argv.slice(2)) {
  const prefix = `${flagName}=`
  const found = args.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : null
}

export function hasFlag(flagName, args = process.argv.slice(2)) {
  return args.includes(flagName)
}

export async function runJsonCli(action) {
  try {
    const result = await action()
    if (result !== undefined) {
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
    process.exit(1)
  }
}
