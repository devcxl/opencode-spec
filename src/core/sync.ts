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

function resolveTargetSpecPath(projectDir: string, slug: string, relativePath: string) {
  return path.join(specsRoot(projectDir), slug, relativePath)
}

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
