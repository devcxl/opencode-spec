import { readdir, stat } from "node:fs/promises"
import path from "node:path"

import { parse, stringify } from "yaml"

import { loadProjectConfig } from "./config.js"
import { pathExists, readOptionalText, writeText } from "./fs.js"
import {
  archiveRoot,
  archiveChangeDir,
  archivedChangeMetaPath,
  changeDir,
  changeMetaPath,
  changeMetaPathForDir,
  slugify,
} from "./paths.js"
import type { BuiltinSchemaName, ChangeMeta } from "./types.js"

interface ChangeLocation {
  dirPath: string
  metaPath: string
  slug: string
  status: "active" | "archived"
}

async function inferChangeMetaFromLocation(projectDir: string, slug: string, location: ChangeLocation): Promise<ChangeMeta> {
  const directoryStats = await stat(location.dirPath)
  const schema = (await loadProjectConfig(projectDir)).schema
  const createdAt = directoryStats.birthtime.toISOString()
  const updatedAt = directoryStats.mtime.toISOString()

  return {
    name: slug,
    slug,
    schema,
    createdAt,
    updatedAt,
    ...(location.status === "archived" ? { archivedAt: updatedAt } : {}),
    status: location.status,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeSchema(value: unknown): BuiltinSchemaName {
  if (value == null || value === "") {
    return "spec-driven"
  }

  if (value !== "spec-driven") {
    throw new Error(`变更 metadata 指定了暂不支持的 schema：${String(value)}`)
  }

  return value
}

function normalizeTimestamp(value: unknown, fallback: string, fieldName: string) {
  if (value == null || value === "") {
    return fallback
  }

  if (typeof value !== "string") {
    throw new Error(`变更 metadata 的 ${fieldName} 必须是字符串时间戳`)
  }

  return value
}

function normalizeOptionalTimestamp(value: unknown, fieldName: string) {
  if (value == null || value === "") {
    return undefined
  }

  if (typeof value !== "string") {
    throw new Error(`变更 metadata 的 ${fieldName} 必须是字符串时间戳`)
  }

  return value
}

function normalizeStatus(value: unknown): ChangeMeta["status"] {
  if (value == null || value === "") {
    return undefined
  }

  if (value !== "active" && value !== "archived") {
    throw new Error(`变更 metadata 的 status 不合法：${String(value)}`)
  }

  return value
}

async function resolveArchivedChangeLocation(projectDir: string, slug: string): Promise<ChangeLocation | null> {
  const archivedDir = archiveChangeDir(projectDir, slug)
  if (await pathExists(archivedDir)) {
    return {
      dirPath: archivedDir,
      metaPath: archivedChangeMetaPath(projectDir, slug),
      slug,
      status: "archived",
    }
  }

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
    const meta = await readChangeMetaFromPath(metaPath)
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

export async function resolveChangeLocation(projectDir: string, name: string): Promise<ChangeLocation | null> {
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

async function readChangeMetaFromPath(filePath: string): Promise<ChangeMeta | null> {
  const raw = await readOptionalText(filePath)
  if (!raw?.trim()) {
    return null
  }

  const parsed = parse(raw)
  if (!isRecord(parsed)) {
    throw new Error("变更 metadata 必须是对象")
  }

  const slug = typeof parsed.slug === "string" && parsed.slug.trim() ? slugify(parsed.slug) : undefined
  if (!slug) {
    throw new Error("变更 metadata 缺少 slug")
  }

  const name = typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : slug
  const createdAt = normalizeTimestamp(parsed.createdAt, new Date(0).toISOString(), "createdAt")
  const updatedAt = normalizeTimestamp(parsed.updatedAt, createdAt, "updatedAt")

  return {
    name,
    slug,
    schema: normalizeSchema(parsed.schema),
    createdAt,
    updatedAt,
    archivedAt: normalizeOptionalTimestamp(parsed.archivedAt, "archivedAt"),
    status: normalizeStatus(parsed.status),
  }
}

export function createChangeMeta(input: {
  name: string
  slug: string
  schema?: BuiltinSchemaName
  now?: Date
}): ChangeMeta {
  const timestamp = (input.now ?? new Date()).toISOString()
  return {
    name: input.name,
    slug: slugify(input.slug),
    schema: input.schema ?? "spec-driven",
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "active",
  }
}

export async function readChangeMeta(projectDir: string, name: string): Promise<ChangeMeta | null> {
  const location = await resolveChangeLocation(projectDir, name)
  if (!location) {
    return null
  }

  const meta = await readChangeMetaFromPath(location.metaPath)
  if (!meta) {
    return null
  }

  return {
    ...meta,
    status: location.status,
  }
}

export async function writeChangeMeta(
  projectDir: string,
  name: string,
  meta: ChangeMeta,
  options?: { archived?: boolean },
) {
  const filePath = options?.archived ? archivedChangeMetaPath(projectDir, name) : changeMetaPath(projectDir, name)
  await writeText(filePath, stringify(meta))
}

export async function resolveChangeMeta(projectDir: string, name: string): Promise<ChangeMeta> {
  const slug = slugify(name)
  const existing = await readChangeMeta(projectDir, slug)
  if (existing) {
    return existing
  }

  const location = await resolveChangeLocation(projectDir, slug)
  if (!location) {
    throw new Error(`未找到变更 ${slug}`)
  }

  return inferChangeMetaFromLocation(projectDir, slug, location)
}

export async function touchChangeMeta(
  projectDir: string,
  name: string,
  updates: Partial<Omit<ChangeMeta, "name" | "slug" | "schema" | "createdAt">> = {},
  now = new Date(),
) {
  const location = await resolveChangeLocation(projectDir, name)
  if (!location) {
    return null
  }

  const slug = slugify(name)
  const current = (await readChangeMetaFromPath(location.metaPath)) ?? (await inferChangeMetaFromLocation(projectDir, slug, location))

  const next: ChangeMeta = {
    ...current,
    ...updates,
    status: updates.status ?? location.status,
    updatedAt: now.toISOString(),
  }

  await writeText(changeMetaPathForDir(location.dirPath), stringify(next))
  return next
}

export type { ChangeLocation }
