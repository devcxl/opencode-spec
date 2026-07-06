import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

const _tempDirs = new Set<string>()

process.once("exit", () => {
  for (const dir of _tempDirs) {
    rm(dir, { recursive: true, force: true }).catch(() => {})
  }
})

export async function setupSkillsDir(sourceSkillsDir: string): Promise<string> {
  const baseDir = await mkdtemp(path.join(tmpdir(), "opencode-spec-skills-"))
  _tempDirs.add(baseDir)
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

  return destDir
}
