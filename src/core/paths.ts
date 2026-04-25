import { mkdir } from "node:fs/promises"
import path from "node:path"

import { pathExists } from "./fs.js"

export const PLUGIN_ID = "opencode-spec"
export const CHANGE_META_FILE = ".openspec.yaml"

export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")

  return slug || "change"
}

export function toRelativePath(projectDir: string, targetPath: string) {
  return path.relative(projectDir, targetPath).replace(/\\/g, "/")
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

export function archiveChangeDir(projectDir: string, name: string) {
  return path.join(archiveRoot(projectDir), slugify(name))
}

export function datedArchiveChangeDir(projectDir: string, name: string, archivedAt: Date | string) {
  const datePrefix = typeof archivedAt === "string" ? archivedAt.slice(0, 10) : archivedAt.toISOString().slice(0, 10)
  return path.join(archiveRoot(projectDir), `${datePrefix}-${slugify(name)}`)
}

export function proposalPath(projectDir: string, name: string) {
  return path.join(changeDir(projectDir, name), "proposal.md")
}

export function designPath(projectDir: string, name: string) {
  return path.join(changeDir(projectDir, name), "design.md")
}

export function tasksPath(projectDir: string, name: string) {
  return path.join(changeDir(projectDir, name), "tasks.md")
}

export function changeSpecsDir(projectDir: string, name: string) {
  return path.join(changeDir(projectDir, name), "specs")
}

export function changeMetaPathForDir(changeDirectory: string) {
  return path.join(changeDirectory, CHANGE_META_FILE)
}

export function changeMetaPath(projectDir: string, name: string) {
  return changeMetaPathForDir(changeDir(projectDir, name))
}

export function archivedChangeMetaPath(projectDir: string, name: string) {
  return changeMetaPathForDir(archiveChangeDir(projectDir, name))
}

export function pluginTemplateDir(projectDir: string) {
  return path.join(projectDir, ".opencode", PLUGIN_ID, "templates")
}

export function projectConfigPath(projectDir: string) {
  return path.join(openspecRoot(projectDir), "config.yaml")
}

export async function ensureOpenSpecStructure(projectDir: string) {
  const targets = [specsRoot(projectDir), changesRoot(projectDir), archiveRoot(projectDir)]
  const created: string[] = []

  for (const target of targets) {
    if (!(await pathExists(target))) {
      await mkdir(target, { recursive: true })
      created.push(toRelativePath(projectDir, target))
    }
  }

  return created
}
