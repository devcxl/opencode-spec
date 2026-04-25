import { access, mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  continueChange,
  createChangeScaffold,
  fastForwardChange,
  getArtifactInstructions,
  getChangeStatus,
  initializeOpenSpec,
  proposeChange,
} from "../src/core/index.ts"

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

describe("OpenSpec P1 workflow", () => {
  it("new 只创建骨架与 metadata", async () => {
    const projectDir = await makeTempDir("opencode-spec-workflow-")

    await initializeOpenSpec({ projectDir })
    const result = await createChangeScaffold({ projectDir, name: "Add Workflow" })

    expect(result.slug).toBe("add-workflow")
    expect(await exists(path.join(projectDir, "openspec", "changes", "add-workflow", ".openspec.yaml"))).toBe(true)
    expect(await exists(path.join(projectDir, "openspec", "changes", "add-workflow", "proposal.md"))).toBe(false)

    const status = await getChangeStatus(projectDir, result.slug)
    expect(status.artifacts.find((artifact) => artifact.id === "proposal")?.state).toBe("ready")
  })

  it("continue 会按 proposal -> specs -> design -> tasks 顺序推进", async () => {
    const projectDir = await makeTempDir("opencode-spec-workflow-")

    await initializeOpenSpec({ projectDir })
    const scaffold = await createChangeScaffold({ projectDir, name: "Step By Step" })

    expect((await continueChange({ projectDir, name: scaffold.slug })).nextArtifact).toBe("proposal")
    expect((await continueChange({ projectDir, name: scaffold.slug })).nextArtifact).toBe("specs")
    expect((await continueChange({ projectDir, name: scaffold.slug })).nextArtifact).toBe("design")
    expect((await continueChange({ projectDir, name: scaffold.slug })).nextArtifact).toBe("tasks")

    await expect(continueChange({ projectDir, name: scaffold.slug })).rejects.toThrow(/没有可继续生成/)
  })

  it("ff 会一次性生成全部 planning artifacts", async () => {
    const projectDir = await makeTempDir("opencode-spec-workflow-")

    await initializeOpenSpec({ projectDir })
    const scaffold = await createChangeScaffold({ projectDir, name: "Fast Forward" })
    const result = await fastForwardChange({ projectDir, name: scaffold.slug })

    expect(result.createdArtifacts.map((artifact) => artifact.artifact)).toEqual(["proposal", "specs", "design", "tasks"])
    expect(await exists(path.join(projectDir, "openspec", "changes", "fast-forward", "proposal.md"))).toBe(true)
    expect(await exists(path.join(projectDir, "openspec", "changes", "fast-forward", "specs", "spec.md"))).toBe(true)
    expect(await exists(path.join(projectDir, "openspec", "changes", "fast-forward", "design.md"))).toBe(true)
    expect(await exists(path.join(projectDir, "openspec", "changes", "fast-forward", "tasks.md"))).toBe(true)
  })

  it("instructions 会返回模板与依赖上下文", async () => {
    const projectDir = await makeTempDir("opencode-spec-workflow-")

    await initializeOpenSpec({ projectDir })
    const scaffold = await createChangeScaffold({ projectDir, name: "Instruction Change" })
    await continueChange({ projectDir, name: scaffold.slug })

    const instructions = await getArtifactInstructions({ projectDir, name: scaffold.slug, artifact: "specs" })
    expect(instructions.state).toBe("ready")
    expect(instructions.targetPaths).toEqual(["openspec/changes/instruction-change/specs/spec.md"])
    expect(instructions.dependencies).toHaveLength(1)
    expect(instructions.dependencies[0]?.files[0]?.path).toBe("openspec/changes/instruction-change/proposal.md")
  })

  it("propose 作为 quick path 仍支持显式内容覆盖", async () => {
    const projectDir = await makeTempDir("opencode-spec-workflow-")

    await initializeOpenSpec({ projectDir })
    const proposed = await proposeChange({
      projectDir,
      name: "Custom Quick Path",
      proposal: "# Proposal: custom\n\n自定义 proposal\n",
      spec: "# Spec: custom\n\n自定义 spec\n",
      design: "# Design: custom\n\n自定义 design\n",
      tasks: "# Tasks: custom\n\n## Implementation\n- [ ] 1.1 自定义任务\n",
    })

    expect(proposed.createdArtifacts).toHaveLength(4)
    await expect(readFile(path.join(projectDir, "openspec", "changes", "custom-quick-path", "proposal.md"), "utf8")).resolves.toContain(
      "自定义 proposal",
    )
    await expect(readFile(path.join(projectDir, "openspec", "changes", "custom-quick-path", "specs", "spec.md"), "utf8")).resolves.toContain(
      "自定义 spec",
    )
  })
})
