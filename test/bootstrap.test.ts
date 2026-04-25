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

  await mkdir(path.join(packageRoot, "assets", "commands"), { recursive: true })
  await mkdir(path.join(packageRoot, "assets", "skills", "openspec"), { recursive: true })
  await mkdir(path.join(packageRoot, "assets", "templates"), { recursive: true })

  await writeFile(path.join(packageRoot, "package.json"), JSON.stringify({ version }, null, 2))
  await writeFile(path.join(packageRoot, "assets", "commands", "opsx-propose.md"), "proposal command")
  await writeFile(path.join(packageRoot, "assets", "skills", "openspec", "SKILL.md"), "skill content")
  await writeFile(path.join(packageRoot, "assets", "templates", "proposal.md"), "# Proposal: {{name}}")

  return packageRoot
}

describe("syncAssets", () => {
  it("首次同步会写入 assets 和 manifest", async () => {
    const packageRoot = await createPackageRoot()
    const projectDir = await makeTempDir("opencode-spec-project-")

    const result = await syncAssets({ projectDir, packageRoot })

    expect(result.changed).toBe(true)
    expect(result.requiresRestart).toBe(true)
    expect(result.conflicts).toEqual([])

    await expect(
      readFile(path.join(projectDir, ".opencode", "commands", "opsx-propose.md"), "utf8"),
    ).resolves.toBe("proposal command")

    await expect(
      readFile(path.join(projectDir, ".opencode", "skills", "openspec", "SKILL.md"), "utf8"),
    ).resolves.toBe("skill content")

    await expect(
      readFile(path.join(projectDir, ".opencode", "opencode-spec", "templates", "proposal.md"), "utf8"),
    ).resolves.toBe("# Proposal: {{name}}")

    const manifest = JSON.parse(
      await readFile(path.join(projectDir, ".opencode", "opencode-spec.manifest.json"), "utf8"),
    )

    expect(manifest.version).toBe("0.1.0")
    expect(Object.keys(manifest.files)).toContain("commands/opsx-propose.md")
  })

  it("重复同步且文件未变化时不重复写入", async () => {
    const packageRoot = await createPackageRoot()
    const projectDir = await makeTempDir("opencode-spec-project-")

    await syncAssets({ projectDir, packageRoot })
    const second = await syncAssets({ projectDir, packageRoot })

    expect(second.changed).toBe(false)
    expect(second.requiresRestart).toBe(false)
    expect(second.writtenFiles).toEqual([])
    expect(second.conflicts).toEqual([])
  })

  it("检测到用户修改时不覆盖原文件，而是写入 .new", async () => {
    const packageRoot = await createPackageRoot("0.1.0")
    const projectDir = await makeTempDir("opencode-spec-project-")

    await syncAssets({ projectDir, packageRoot })

    const commandPath = path.join(projectDir, ".opencode", "commands", "opsx-propose.md")
    await writeFile(commandPath, "user customized command")
    await writeFile(path.join(packageRoot, "assets", "commands", "opsx-propose.md"), "updated command")
    await writeFile(path.join(packageRoot, "package.json"), JSON.stringify({ version: "0.2.0" }, null, 2))

    const result = await syncAssets({ projectDir, packageRoot })

    expect(result.changed).toBe(true)
    expect(result.conflicts).toContain("commands/opsx-propose.md")
    await expect(readFile(commandPath, "utf8")).resolves.toBe("user customized command")
    await expect(readFile(`${commandPath}.new`, "utf8")).resolves.toBe("updated command")
    expect(await exists(`${commandPath}.new`)).toBe(true)
  })

  it("插件删除已同步资源时会清理未被用户修改的旧文件", async () => {
    const packageRoot = await createPackageRoot("0.1.0")
    const projectDir = await makeTempDir("opencode-spec-project-")

    await syncAssets({ projectDir, packageRoot })
    await rm(path.join(packageRoot, "assets", "commands", "opsx-propose.md"))
    await writeFile(path.join(packageRoot, "package.json"), JSON.stringify({ version: "0.2.0" }, null, 2))

    const result = await syncAssets({ projectDir, packageRoot })

    expect(result.changed).toBe(true)
    expect(result.requiresRestart).toBe(true)
    expect(await exists(path.join(projectDir, ".opencode", "commands", "opsx-propose.md"))).toBe(false)
  })

  it("插件删除资源时，若目标已被用户修改则保留原文件并记录冲突", async () => {
    const packageRoot = await createPackageRoot("0.1.0")
    const projectDir = await makeTempDir("opencode-spec-project-")

    await syncAssets({ projectDir, packageRoot })
    const commandPath = path.join(projectDir, ".opencode", "commands", "opsx-propose.md")
    await writeFile(commandPath, "user customized command")
    await rm(path.join(packageRoot, "assets", "commands", "opsx-propose.md"))
    await writeFile(path.join(packageRoot, "package.json"), JSON.stringify({ version: "0.2.0" }, null, 2))

    const result = await syncAssets({ projectDir, packageRoot })

    expect(result.changed).toBe(true)
    expect(result.conflicts).toContain("commands/opsx-propose.md")
    await expect(readFile(commandPath, "utf8")).resolves.toBe("user customized command")
    expect(await exists(commandPath)).toBe(true)
  })

  it("同步后的 skill 脚本命令应保留项目内相对路径，并可在项目根执行", async () => {
    const packageRoot = path.resolve(__dirname, "..")
    const projectDir = await makeTempDir("opencode spec project-")

    await syncAssets({ projectDir, packageRoot })

    const skillPath = path.join(projectDir, ".opencode", "skills", "openspec-explore", "SKILL.md")
    const skillContent = await readFile(skillPath, "utf8")
    const commandLine = skillContent
      .split(/\r?\n/)
      .find((line) => line.includes("openspec-explore/references/list.js"))

    expect(commandLine).toBeTruthy()
    expect(commandLine).toContain("node .opencode/skills/")
    expect(commandLine).not.toContain(projectDir)

    const { stdout } = await execFileAsync("bash", ["-lc", commandLine!], { cwd: projectDir })

    expect(JSON.parse(stdout)).toEqual({ active: [], archived: [] })
  })

  it("同步后的 command 脚本命令应保留项目内相对路径", async () => {
    const packageRoot = path.resolve(__dirname, "..")
    const projectDir = await makeTempDir("opencode-spec-project-")

    await syncAssets({ projectDir, packageRoot })

    const commandPath = path.join(projectDir, ".opencode", "commands", "opsx-propose.md")
    const commandContent = await readFile(commandPath, "utf8")
    const newChangeCommand = commandContent
      .split(/\r?\n/)
      .find((line) => line.includes("openspec-propose/references/new-change.js"))

    expect(commandContent).toContain("node .opencode/skills/")
    expect(commandContent).not.toContain(projectDir)
    expect(newChangeCommand).toBeTruthy()

    await execFileAsync("bash", ["-lc", newChangeCommand!.replaceAll("$ARGUMENTS", "Command Demo")], { cwd: projectDir })

    expect(await exists(path.join(projectDir, "openspec", "changes", "command-demo", ".openspec.yaml"))).toBe(true)
  })
})
