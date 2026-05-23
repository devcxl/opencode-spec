import { access, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

/** 确保文本以换行符结尾，符合 Unix 文件约定 */
export function normalizeText(content: string) {
  return content.endsWith("\n") ? content : `${content}\n`
}

/** 检查路径是否存在（文件或目录均可） */
export async function pathExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

/** 尝试读取文件内容，不存在时返回 null 而非抛异常 */
export async function readOptionalText(filePath: string) {
  if (!(await pathExists(filePath))) {
    return null
  }

  return readFile(filePath, "utf8")
}

/** 确保父目录存在，若缺失则递归创建 */
export async function ensureParentDir(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
}

/** 写入文本文件（自动创建父目录、以换行符结尾） */
export async function writeText(filePath: string, content: string) {
  await ensureParentDir(filePath)
  await writeFile(filePath, normalizeText(content), "utf8")
}

/** 列出指定目录下的所有子目录名称（排序后） */
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

/** 递归列出指定目录下的所有文件（扁平化排序后） */
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

/** 递归复制目录（自动创建目标目录） */
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
