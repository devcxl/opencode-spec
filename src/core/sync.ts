import { readFile } from "node:fs/promises"
import path from "node:path"

import { resolveChangeLocation } from "./change.js"
import { listFilesRecursive, writeText } from "./fs.js"
import { specsRoot, toRelativePath } from "./paths.js"
import { validateChange } from "./validate.js"

export interface SyncChangeSpecsInput {
  projectDir: string
  name: string
}

/** 计算规格文件在全局 specs 目录中的目标路径 */
function resolveTargetSpecPath(projectDir: string, slug: string, relativePath: string) {
  return path.join(specsRoot(projectDir), slug, relativePath)
}

/**
 * 将变更中的规格文件同步到全局 specs 目录
 *
 * 在归档时调用，将变更的 specs/*.md 复制到 openspec/specs/<slug>/ 下，
 * 使得已归档变更的规格说明可在全局位置被长期引用。
 */
export async function syncChangeSpecs(input: SyncChangeSpecsInput) {
  const validation = await validateChange({ projectDir: input.projectDir, name: input.name, strict: true })
  const location = await resolveChangeLocation(input.projectDir, validation.slug)
  if (!location) {
    throw new Error(`未找到变更 ${validation.slug}`)
  }

  const specFiles = await listFilesRecursive(path.join(location.dirPath, "specs"))
  const syncedFiles: string[] = []

  for (const filePath of specFiles.filter((item) => item.endsWith(".md"))) {
    const relativePath = path.relative(path.join(location.dirPath, "specs"), filePath).replace(/\\/g, "/")
    const targetPath = resolveTargetSpecPath(input.projectDir, validation.slug, relativePath)
    const content = await readFile(filePath, "utf8")
    await writeText(targetPath, content)
    syncedFiles.push(toRelativePath(input.projectDir, targetPath))
  }

  return {
    slug: validation.slug,
    syncedFiles,
  }
}
