import { execFile } from "node:child_process"
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"

import { afterEach, describe, expect, it } from "vitest"

import { syncAssets } from "../src/bootstrap/sync-assets.ts"

const execFileAsync = promisify(execFile)
const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function makeTempDir(prefix: string) {
  const dir = await mkdtemp(path.join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

async function exists(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function createPackageRoot(version = "0.1.0") {
  const packageRoot = await makeTempDir("opencode-spec-package-")

  await mkdir(path.join(packageRoot, "assets", "skills", "openspec", "references"), { recursive: true })
  await mkdir(path.join(packageRoot, "assets", "templates"), { recursive: true })

  await writeFile(path.join(packageRoot, "package.json"), JSON.stringify({ version }, null, 2))
  await writeFile(path.join(packageRoot, "assets", "skills", "openspec", "SKILL.md"), "skill content")
  await writeFile(path.join(packageRoot, "assets", "skills", "openspec", "references", "helper.js"), "console.log('ok')")
  await writeFile(path.join(packageRoot, "assets", "templates", "proposal.md"), "# Proposal: {{name}}")

  return packageRoot
}

describe("syncAssets", () => {
  it("首次同步只写入 JS 脚本和 templates，跳过 .md 和 .json", async () => {
    const packageRoot = await createPackageRoot()
    const projectDir = await makeTempDir("opencode-spec-project-")

    const result = await syncAssets({ projectDir, packageRoot })

    expect(result.changed).toBe(true)

    expect(result.conflicts).toEqual([])

    // JS 脚本被同步
    await expect(
      readFile(path.join(projectDir, ".opencode", "skills", "openspec", "references", "helper.js"), "utf8"),
    ).resolves.toBe("console.log('ok')")

    // SKILL.md 不再同步
    expect(await exists(path.join(projectDir, ".opencode", "skills", "openspec", "SKILL.md"))).toBe(false)

    // Templates 依然同步
    await expect(
      readFile(path.join(projectDir, ".opencode", "opencode-spec", "templates", "proposal.md"), "utf8"),
    ).resolves.toBe("# Proposal: {{name}}")

    const manifest = JSON.parse(
      await readFile(path.join(projectDir, ".opencode", "opencode-spec.manifest.json"), "utf8"),
    )

    expect(manifest.version).toBe("0.1.0")
    expect(Object.keys(manifest.files)).toContain("skills/openspec/references/helper.js")
    expect(Object.keys(manifest.files)).not.toContain("skills/openspec/SKILL.md")
  })

  it("重复同步且文件未变化时不重复写入", async () => {
    const packageRoot = await createPackageRoot()
    const projectDir = await makeTempDir("opencode-spec-project-")

    await syncAssets({ projectDir, packageRoot })
    const second = await syncAssets({ projectDir, packageRoot })

    expect(second.changed).toBe(false)
    expect(second.writtenFiles).toEqual([])
    expect(second.conflicts).toEqual([])
  })

  it("检测到用户修改时不覆盖原文件，而是写入 .new", async () => {
    const packageRoot = await createPackageRoot("0.1.0")
    const projectDir = await makeTempDir("opencode-spec-project-")

    await syncAssets({ projectDir, packageRoot })

    const scriptPath = path.join(projectDir, ".opencode", "skills", "openspec", "references", "helper.js")
    await writeFile(scriptPath, "user customized script")
    await writeFile(path.join(packageRoot, "assets", "skills", "openspec", "references", "helper.js"), "updated script")
    await writeFile(path.join(packageRoot, "package.json"), JSON.stringify({ version: "0.2.0" }, null, 2))

    const result = await syncAssets({ projectDir, packageRoot })

    expect(result.changed).toBe(true)
    expect(result.conflicts).toContain("skills/openspec/references/helper.js")
    await expect(readFile(scriptPath, "utf8")).resolves.toBe("user customized script")
    await expect(readFile(`${scriptPath}.new`, "utf8")).resolves.toBe("updated script")
  })

  it("插件删除已同步资源时会清理未被用户修改的旧文件", async () => {
    const packageRoot = await createPackageRoot("0.1.0")
    const projectDir = await makeTempDir("opencode-spec-project-")

    await syncAssets({ projectDir, packageRoot })
    await rm(path.join(packageRoot, "assets", "skills", "openspec", "references"), { recursive: true, force: true })
    await writeFile(path.join(packageRoot, "package.json"), JSON.stringify({ version: "0.2.0" }, null, 2))

    const result = await syncAssets({ projectDir, packageRoot })

    expect(result.changed).toBe(true)
    expect(await exists(path.join(projectDir, ".opencode", "skills", "openspec", "references", "helper.js"))).toBe(false)
  })

  it("同步后的 skill 脚本命令应保留项目内相对路径，并可在项目根执行", async () => {
    const packageRoot = path.resolve(__dirname, "..")
    const projectDir = await makeTempDir("opencode-spec-project-")

    await syncAssets({ projectDir, packageRoot })

    const listJsPath = path.join(projectDir, ".opencode", "skills", "openspec-explore", "references", "list.js")
    expect(await exists(listJsPath)).toBe(true)

    const { stdout } = await execFileAsync("node", [listJsPath], { cwd: projectDir })
    expect(JSON.parse(stdout)).toEqual({ active: [], archived: [] })
  })
})
