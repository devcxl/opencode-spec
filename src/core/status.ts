import path from "node:path"

import { resolveChangeLocation, resolveChangeMeta } from "./change.js"
import { listFilesRecursive, pathExists } from "./fs.js"
import { getArtifactDefinition, getSchema } from "./schema.js"
import { toRelativePath } from "./paths.js"
import type { ChangeMeta } from "./types.js"
import type { ArtifactId, ArtifactStatus, ChangeStatus } from "./types.js"

async function resolveChangeBaseDir(projectDir: string, slug: string) {
  const location = await resolveChangeLocation(projectDir, slug)
  if (!location) {
    throw new Error(`未找到变更 ${slug}`)
  }

  return location.dirPath
}

function globPatternToRegExp(pattern: string) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&")
  const doubleStarNormalized = escaped.replace(/\*\*\//g, "(?:.*/)?")
  const singleStarNormalized = doubleStarNormalized.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*")
  return new RegExp(`^${singleStarNormalized}$`)
}

async function matchOutputPath(projectDir: string, baseDir: string, outputPath: string) {
  if (!outputPath.includes("*")) {
    const filePath = `${baseDir}/${outputPath}`
    return (await pathExists(filePath)) ? [toRelativePath(projectDir, filePath)] : []
  }

  const matcher = globPatternToRegExp(outputPath)
  const files = await listFilesRecursive(baseDir)
  return files
    .filter((filePath: string) => matcher.test(path.relative(baseDir, filePath).replace(/\\/g, "/")))
    .map((filePath: string) => toRelativePath(projectDir, filePath))
}

async function detectArtifactPathsForMeta(projectDir: string, meta: ChangeMeta, artifactId: ArtifactId) {
  const baseDir = await resolveChangeBaseDir(projectDir, meta.slug)
  const definition = getArtifactDefinition(meta.schema, artifactId)
  const matched = await Promise.all(definition.outputPaths.map((outputPath) => matchOutputPath(projectDir, baseDir, outputPath)))
  return matched.flat().sort((left, right) => left.localeCompare(right))
}

export async function detectArtifactPaths(projectDir: string, slug: string, artifactId: ArtifactId) {
  const meta = await resolveChangeMeta(projectDir, slug)
  return detectArtifactPathsForMeta(projectDir, meta, artifactId)
}

async function getArtifactStatusForMeta(projectDir: string, meta: ChangeMeta, artifactId: ArtifactId): Promise<ArtifactStatus> {
  const existingPaths = await detectArtifactPathsForMeta(projectDir, meta, artifactId)
  if (existingPaths.length > 0) {
    return {
      id: artifactId,
      state: "done",
      existingPaths,
      missingDeps: [],
    }
  }

  const definition = getArtifactDefinition(meta.schema, artifactId)
  const depStatuses = await Promise.all(definition.requires.map((depId) => detectArtifactPathsForMeta(projectDir, meta, depId)))
  const missingDeps = definition.requires.filter((_, index) => depStatuses[index]?.length === 0)

  return {
    id: artifactId,
    state: missingDeps.length > 0 ? "blocked" : "ready",
    existingPaths,
    missingDeps,
  }
}

export async function getArtifactStatus(projectDir: string, slug: string, artifactId: ArtifactId): Promise<ArtifactStatus> {
  const meta = await resolveChangeMeta(projectDir, slug)
  return getArtifactStatusForMeta(projectDir, meta, artifactId)
}

export async function getChangeStatus(projectDir: string, slug: string): Promise<ChangeStatus> {
  const meta = await resolveChangeMeta(projectDir, slug)
  const schema = getSchema(meta.schema)
  const artifacts = await Promise.all(schema.artifacts.map((artifact) => getArtifactStatusForMeta(projectDir, meta, artifact.id)))

  return {
    slug: meta.slug,
    schema: meta.schema,
    artifacts,
  }
}
