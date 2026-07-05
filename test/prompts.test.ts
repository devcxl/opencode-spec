import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { getBootstrapContent, initBootstrap, resetBootstrap } from "../src/plugin/bootstrap.js"
import { initPrompts, loadPrompt, resetPrompts } from "../src/plugin/prompts.js"

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  resetPrompts()
  resetBootstrap()
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

    initPrompts(pkgDir, projDir)
    expect((await loadPrompt("bootstrap")).trim()).toBe("builtin content")
  })

  it("项目覆盖优先于内置 prompt", async () => {
    const pkgDir = await makeTempDir()
    const projDir = await makeTempDir()
    await mkdir(path.join(pkgDir, "assets", "prompts"), { recursive: true })
    await writeFile(path.join(pkgDir, "assets", "prompts", "bootstrap.md"), "builtin content\n")
    await mkdir(path.join(projDir, ".opencode", "opencode-spec", "prompts"), { recursive: true })
    await writeFile(path.join(projDir, ".opencode", "opencode-spec", "prompts", "bootstrap.md"), "project override\n")

    initPrompts(pkgDir, projDir)
    expect((await loadPrompt("bootstrap")).trim()).toBe("project override")
  })

  it("两者都不存在时返回默认兜底", async () => {
    initPrompts(await makeTempDir(), await makeTempDir())
    const result = await loadPrompt("bootstrap")
    expect(result).toContain("EXTREMELY_IMPORTANT")
    expect(result).toContain("opsx-propose")
  })

  it("不存在的 prompt 名称返回空字符串", async () => {
    initPrompts(await makeTempDir(), await makeTempDir())
    expect(await loadPrompt("nonexistent")).toBe("")
  })
})

describe("getBootstrapContent", () => {
  it("initBootstrap 后返回 bootstrap.md 文件内容", async () => {
    const pkgDir = await makeTempDir()
    const projDir = await makeTempDir()
    await mkdir(path.join(pkgDir, "assets", "prompts"), { recursive: true })
    await writeFile(path.join(pkgDir, "assets", "prompts", "bootstrap.md"), "custom bootstrap\n")

    initPrompts(pkgDir, projDir)
    await initBootstrap()

    expect(getBootstrapContent().trim()).toBe("custom bootstrap")
  })

  it("未 initBootstrap 时返回硬编码兜底", () => {
    resetBootstrap()
    const result = getBootstrapContent()
    expect(result).toContain("EXTREMELY_IMPORTANT")
    expect(result).toContain("opsx-propose")
  })
})
