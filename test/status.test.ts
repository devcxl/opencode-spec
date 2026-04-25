import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { getArtifactStatus, getChangeStatus, initializeOpenSpec } from "../src/core/index.ts"

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function makeTempDir(prefix: string) {
  const dir = await mkdtemp(path.join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

async function writeChangeFile(projectDir: string, slug: string, relativePath: string, content: string) {
  const filePath = path.join(projectDir, "openspec", "changes", slug, relativePath)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content, "utf8")
}

describe("OpenSpec change status", () => {
  it("只有 proposal 时 specs 和 design 为 ready，tasks 为 blocked", async () => {
    const projectDir = await makeTempDir("opencode-spec-status-")
    const slug = "status-proposal-only"

    await initializeOpenSpec({ projectDir })
    await writeChangeFile(projectDir, slug, "proposal.md", "# Proposal\n")

    await expect(getArtifactStatus(projectDir, slug, "proposal")).resolves.toMatchObject({ state: "done" })
    await expect(getArtifactStatus(projectDir, slug, "specs")).resolves.toMatchObject({ state: "ready" })
    await expect(getArtifactStatus(projectDir, slug, "design")).resolves.toMatchObject({ state: "ready" })
    await expect(getArtifactStatus(projectDir, slug, "tasks")).resolves.toMatchObject({
      state: "blocked",
      missingDeps: ["specs", "design"],
    })
  })

  it("proposal + design + specs 时 tasks 为 ready", async () => {
    const projectDir = await makeTempDir("opencode-spec-status-")
    const slug = "status-ready-tasks"

    await initializeOpenSpec({ projectDir })
    await writeChangeFile(projectDir, slug, "proposal.md", "# Proposal\n")
    await writeChangeFile(projectDir, slug, "design.md", "# Design\n")
    await writeChangeFile(projectDir, slug, "specs/spec.md", "# Spec\n")

    await expect(getArtifactStatus(projectDir, slug, "tasks")).resolves.toMatchObject({
      state: "ready",
      missingDeps: [],
    })
  })

  it("全部工件存在时整个 change status 为 done", async () => {
    const projectDir = await makeTempDir("opencode-spec-status-")
    const slug = "status-all-done"

    await initializeOpenSpec({ projectDir })
    await writeChangeFile(projectDir, slug, "proposal.md", "# Proposal\n")
    await writeChangeFile(projectDir, slug, "design.md", "# Design\n")
    await writeChangeFile(projectDir, slug, "tasks.md", "# Tasks\n")
    await writeChangeFile(projectDir, slug, "specs/spec.md", "# Spec\n")

    const status = await getChangeStatus(projectDir, slug)
    expect(status.schema).toBe("spec-driven")
    expect(status.artifacts.every((artifact) => artifact.state === "done")).toBe(true)
  })
})
