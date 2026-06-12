import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

/**
 * 在临时目录中复制并处理 skills 目录
 *
 * SKILL.md 中的路径占位符 .opencode/skills/ 会被替换为实际的临时目录路径。
 * 进程退出时自动清理临时目录。
 */
export async function setupSkillsDir(sourceSkillsDir: string): Promise<string> {
  const baseDir = await mkdtemp(path.join(tmpdir(), "opencode-spec-skills-"))
  const destDir = path.join(baseDir, "skills")

  await cp(sourceSkillsDir, destDir, { recursive: true })

  async function processDir(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await processDir(fullPath)
        continue
      }
      if (entry.name === "SKILL.md") {
        let content = await readFile(fullPath, "utf8")
        content = content.replaceAll(".opencode/skills/", `${destDir}/`)
        await writeFile(fullPath, content, "utf8")
      }
    }
  }

  await processDir(destDir)

  process.on("exit", () => {
    rm(baseDir, { recursive: true, force: true }).catch(() => {})
  })

  return destDir
}
