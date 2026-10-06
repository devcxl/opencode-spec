import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { loadBootstrap } from "../src/plugin/bootstrap.js"
import { loadPrompt } from "../src/plugin/prompts.js"

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function makeTempDir() {
  const dir = await mkdtemp(path.join(tmpdir(), "opencode-spec-test-"))
  tempDirs.push(dir)
  return dir
}

describe("loadPrompt", () => {
  it("返回内置 prompt 文件内容（无项目覆盖时）", async () => {
    const pkgDir = await makeTempDir()
    const projDir = await makeTempDir()
    await mkdir(path.join(pkgDir, "assets", "prompts"), { recursive: true })
    await writeFile(path.join(pkgDir, "assets", "prompts", "bootstrap.md"), "builtin content\n")

    expect((await loadPrompt(pkgDir, projDir, "bootstrap")).trim()).toBe("builtin content")
  })

  it("项目覆盖优先于内置 prompt", async () => {
    const pkgDir = await makeTempDir()
    const projDir = await makeTempDir()
    await mkdir(path.join(pkgDir, "assets", "prompts"), { recursive: true })
    await writeFile(path.join(pkgDir, "assets", "prompts", "bootstrap.md"), "builtin content\n")
    await mkdir(path.join(projDir, ".opencode", "opencode-spec", "prompts"), { recursive: true })
    await writeFile(path.join(projDir, ".opencode", "opencode-spec", "prompts", "bootstrap.md"), "project override\n")

    expect((await loadPrompt(pkgDir, projDir, "bootstrap")).trim()).toBe("project override")
  })

  it("不存在的 prompt 名称返回空字符串", async () => {
    expect(await loadPrompt(await makeTempDir(), await makeTempDir(), "nonexistent")).toBe("")
  })
})

describe("loadBootstrap", () => {
  it("加载本项目的 bootstrap.md", async () => {
    const pkgDir = await makeTempDir()
    const projDir = await makeTempDir()
    await mkdir(path.join(pkgDir, "assets", "prompts"), { recursive: true })
    await writeFile(path.join(pkgDir, "assets", "prompts", "bootstrap.md"), "custom bootstrap\n")

    expect((await loadBootstrap(pkgDir, projDir)).trim()).toBe("custom bootstrap")
  })

  it("并行加载时每个项目只接收自己的覆盖文件", async () => {
    const pkgDir = await makeTempDir()
    const first = await makeTempDir()
    const second = await makeTempDir()
    for (const project of [first, second]) {
      await mkdir(path.join(project, ".opencode", "opencode-spec", "prompts"), { recursive: true })
    }
    await writeFile(path.join(first, ".opencode/opencode-spec/prompts/bootstrap.md"), "first project")
    await writeFile(path.join(second, ".opencode/opencode-spec/prompts/bootstrap.md"), "second project")

    expect(await Promise.all([loadBootstrap(pkgDir, first), loadBootstrap(pkgDir, second)])).toEqual([
      "first project", "second project",
    ])
  })

  it("缺失 bootstrap 时明确失败，不注入其他项目内容", async () => {
    await expect(loadBootstrap(await makeTempDir(), await makeTempDir())).rejects.toThrow("bootstrap")
  })
})
