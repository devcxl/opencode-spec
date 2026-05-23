import path from "node:path"

import { resolveChangeLocation, resolveChangeMeta } from "./change.js"
import { listFilesRecursive, pathExists } from "./fs.js"
import { getArtifactDefinition, getSchema } from "./schema.js"
import { toRelativePath } from "./paths.js"
import type { ChangeMeta } from "./types.js"
import type { ArtifactId, ArtifactStatus, ChangeStatus } from "./types.js"

/** 解析变更的基准目录路径 */
async function resolveChangeBaseDir(projectDir: string, slug: string) {
  const location = await resolveChangeLocation(projectDir, slug)
  if (!location) {
    throw new Error(`未找到变更 ${slug}`)
  }

  return location.dirPath
}

/**
 * 将 glob 模式转换为正则表达式
 *
 * 支持 **（跨目录匹配）、*（单段匹配）等基本 glob 语法。
 */
function globPatternToRegExp(pattern: string) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&")
  const doubleStarNormalized = escaped.replace(/\*\*\//g, "(?:.*/)?")
  const singleStarNormalized = doubleStarNormalized.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*")
  return new RegExp(`^${singleStarNormalized}$`)
}

/**
 * 匹配制品定义中的输出路径模式
 *
 * 如果 outputPath 不含 *，直接检测文件是否存在；
 * 否则使用 glob 匹配递归列出所有符合条件的文件。
 */
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

/** 使用 ChangeMeta 检测制品的文件路径 */
async function detectArtifactPathsForMeta(projectDir: string, meta: ChangeMeta, artifactId: ArtifactId) {
  const baseDir = await resolveChangeBaseDir(projectDir, meta.slug)
  const definition = getArtifactDefinition(meta.schema, artifactId)
  const matched = await Promise.all(definition.outputPaths.map((outputPath) => matchOutputPath(projectDir, baseDir, outputPath)))
  return matched.flat().sort((left, right) => left.localeCompare(right))
}

/** 检测变更中某个制品的产出文件路径（按 slug 查找） */
export async function detectArtifactPaths(projectDir: string, slug: string, artifactId: ArtifactId) {
  const meta = await resolveChangeMeta(projectDir, slug)
  return detectArtifactPathsForMeta(projectDir, meta, artifactId)
}

/**
 * 获取某个制品在当前变更中的状态
 *
 * 状态判定逻辑：
 * - 如果制品文件存在 → "done"
 * - 如果前置依赖的文件都存在 → "ready"（可以生成了）
 * - 如果前置依赖缺失 → "blocked"
 */
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

/** 获取变更中指定制品的状态 */
export async function getArtifactStatus(projectDir: string, slug: string, artifactId: ArtifactId): Promise<ArtifactStatus> {
  const meta = await resolveChangeMeta(projectDir, slug)
  return getArtifactStatusForMeta(projectDir, meta, artifactId)
}

/** 获取变更的完整状态（所有制品的状态） */
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
