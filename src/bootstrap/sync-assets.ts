import { createHash } from "node:crypto"
import { readdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { ensureParentDir, pathExists, readOptionalText } from "../core/common.js"
import { createManifest, readManifest, writeManifest } from "./manifest.js"
import type { AssetManifestFile } from "./manifest.js"

const ASSET_KINDS = ["commands", "skills", "templates"] as const

type AssetKind = (typeof ASSET_KINDS)[number]

export interface SyncAssetsInput {
  packageRoot: string
  projectDir: string
}

export interface SyncAssetsResult {
  changed: boolean
  conflicts: string[]
  requiresRestart: boolean
  skippedFiles: string[]
  version: string
  writtenFiles: string[]
}

function hashContent(content: string) {
  return createHash("sha256").update(content).digest("hex")
}

async function listFilesRecursive(rootDir: string, currentDir = rootDir): Promise<string[]> {
  if (!(await pathExists(currentDir))) {
    return []
  }

  const entries = await readdir(currentDir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(rootDir, fullPath)))
      continue
    }

    files.push(path.relative(rootDir, fullPath).replace(/\\/g, "/"))
  }

  return files.sort((left, right) => left.localeCompare(right))
}

function getTargetPath(projectDir: string, kind: AssetKind, relativePath: string) {
  if (kind === "commands") {
    return path.join(projectDir, ".opencode", "commands", relativePath)
  }

  if (kind === "skills") {
    return path.join(projectDir, ".opencode", "skills", relativePath)
  }

  return path.join(projectDir, ".opencode", "opencode-spec", "templates", relativePath)
}

async function readPluginVersion(packageRoot: string) {
  const raw = await readFile(path.join(packageRoot, "package.json"), "utf8")
  const packageJson = JSON.parse(raw) as { version?: string }
  return packageJson.version ?? "0.0.0"
}

export async function syncAssets(input: SyncAssetsInput): Promise<SyncAssetsResult> {
  const manifest = await readManifest(input.projectDir)
  const version = await readPluginVersion(input.packageRoot)

  let changed = false
  let requiresRestart = false
  const writtenFiles: string[] = []
  const skippedFiles: string[] = []
  const conflicts: string[] = []
  const nextFiles: Record<string, AssetManifestFile> = {}

  for (const kind of ASSET_KINDS) {
    const sourceRoot = path.join(input.packageRoot, "assets", kind)
    const files = await listFilesRecursive(sourceRoot)

    for (const relativePath of files) {
      const manifestKey = `${kind}/${relativePath}`
      const sourcePath = path.join(sourceRoot, relativePath)
      const targetPath = getTargetPath(input.projectDir, kind, relativePath)
      const sourceContent = await readFile(sourcePath, "utf8")
      const sourceHash = hashContent(sourceContent)
      const currentContent = await readOptionalText(targetPath)
      const currentHash = currentContent ? hashContent(currentContent) : null
      const previous = manifest?.files[manifestKey]

      if (currentContent === null) {
        await ensureParentDir(targetPath)
        await writeFile(targetPath, sourceContent, "utf8")
        changed = true
        writtenFiles.push(path.relative(input.projectDir, targetPath).replace(/\\/g, "/"))
        nextFiles[manifestKey] = {
          hash: sourceHash,
          target: path.relative(input.projectDir, targetPath).replace(/\\/g, "/"),
        }

        if (kind !== "templates") {
          requiresRestart = true
        }
        continue
      }

      if (currentHash === sourceHash) {
        nextFiles[manifestKey] = {
          hash: sourceHash,
          target: path.relative(input.projectDir, targetPath).replace(/\\/g, "/"),
        }
        continue
      }

      if (previous && previous.hash === currentHash) {
        await writeFile(targetPath, sourceContent, "utf8")
        changed = true
        writtenFiles.push(path.relative(input.projectDir, targetPath).replace(/\\/g, "/"))
        nextFiles[manifestKey] = {
          hash: sourceHash,
          target: path.relative(input.projectDir, targetPath).replace(/\\/g, "/"),
        }

        if (kind !== "templates") {
          requiresRestart = true
        }
        continue
      }

      const newFilePath = `${targetPath}.new`
      const existingNewContent = await readOptionalText(newFilePath)
      if (existingNewContent !== sourceContent) {
        await ensureParentDir(newFilePath)
        await writeFile(newFilePath, sourceContent, "utf8")
        writtenFiles.push(path.relative(input.projectDir, newFilePath).replace(/\\/g, "/"))
      }

      changed = true
      conflicts.push(manifestKey)
      skippedFiles.push(manifestKey)

      if (previous) {
        nextFiles[manifestKey] = previous
      }
    }
  }

  for (const [manifestKey, previous] of Object.entries(manifest?.files ?? {})) {
    if (manifestKey in nextFiles) {
      continue
    }

    const targetPath = path.join(input.projectDir, previous.target)
    const currentContent = await readOptionalText(targetPath)
    const currentHash = currentContent ? hashContent(currentContent) : null

    if (currentContent !== null && previous.hash === currentHash) {
      await rm(targetPath, { force: true, recursive: true })
      changed = true
      writtenFiles.push(previous.target)

      const newFilePath = `${targetPath}.new`
      if (await pathExists(newFilePath)) {
        await rm(newFilePath, { force: true, recursive: true })
        writtenFiles.push(`${previous.target}.new`)
      }

      requiresRestart ||= manifestKey.startsWith("commands/") || manifestKey.startsWith("skills/")
      continue
    }

    if (currentContent !== null) {
      changed = true
      conflicts.push(manifestKey)
      skippedFiles.push(manifestKey)
      nextFiles[manifestKey] = previous
    }
  }

  const nextManifest = createManifest(version, nextFiles)
  const manifestChanged = JSON.stringify(manifest?.files ?? {}) !== JSON.stringify(nextManifest.files)
  const versionChanged = manifest?.version !== version

  if (manifestChanged || versionChanged || changed) {
    await writeManifest(input.projectDir, nextManifest)
  }

  return {
    changed,
    conflicts,
    requiresRestart,
    skippedFiles,
    version,
    writtenFiles,
  }
}
