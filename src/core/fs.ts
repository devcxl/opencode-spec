import { access, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

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

export async function listFilesRecursive(dirPath: string): Promise<string[]> {
  if (!(await pathExists(dirPath))) {
    return []
  }

  const entries = await readdir(dirPath, { withFileTypes: true })
  const files: string[][] = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const entryPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        return listFilesRecursive(entryPath)
      }

      return [entryPath]
    }),
  )

  return files.flat().sort((left: string, right: string) => left.localeCompare(right))
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
