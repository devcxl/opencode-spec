import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { loadProjectConfig } from "../src/core/index.ts"

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function makeTempDir(prefix: string) {
  const dir = await mkdtemp(path.join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

describe("OpenSpec project config", () => {
  it("无 config 文件时返回默认 schema", async () => {
    const projectDir = await makeTempDir("opencode-spec-config-")

    await mkdir(path.join(projectDir, "openspec"), { recursive: true })

    await expect(loadProjectConfig(projectDir)).resolves.toEqual({ schema: "spec-driven" })
  })

  it("空 config 文件时仍返回默认 schema", async () => {
    const projectDir = await makeTempDir("opencode-spec-config-")
    await mkdir(path.join(projectDir, "openspec"), { recursive: true })
    await writeFile(path.join(projectDir, "openspec", "config.yaml"), "", "utf8")

    await expect(loadProjectConfig(projectDir)).resolves.toEqual({ schema: "spec-driven" })
  })

  it("支持读取 spec-driven schema", async () => {
    const projectDir = await makeTempDir("opencode-spec-config-")
    await mkdir(path.join(projectDir, "openspec"), { recursive: true })
    await writeFile(path.join(projectDir, "openspec", "config.yaml"), "schema: spec-driven\n", "utf8")

    await expect(loadProjectConfig(projectDir)).resolves.toEqual({ schema: "spec-driven" })
  })

  it("不支持未知 schema", async () => {
    const projectDir = await makeTempDir("opencode-spec-config-")
    await mkdir(path.join(projectDir, "openspec"), { recursive: true })
    await writeFile(path.join(projectDir, "openspec", "config.yaml"), "schema: custom\n", "utf8")

    await expect(loadProjectConfig(projectDir)).rejects.toThrow(/暂不支持/)
  })
})
