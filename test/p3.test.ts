import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  bulkArchiveChanges,
  initializeOpenSpec,
  listSchemas,
  listTemplateInfos,
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

describe("OpenSpec P3 capabilities", () => {
  it("schemas 能列出当前生效 schema 与 artifacts", async () => {
    const projectDir = await makeTempDir("opencode-spec-p3-")
    await initializeOpenSpec({ projectDir })

    const result = await listSchemas(projectDir)
    expect(result.activeSchema).toBe("spec-driven")
    expect(result.schemas[0]?.artifacts.map((artifact) => artifact.id)).toEqual(["proposal", "specs", "design", "tasks"])
  })

  it("templates 能区分 builtin 与 project override", async () => {
    const projectDir = await makeTempDir("opencode-spec-p3-")
    await initializeOpenSpec({ projectDir })

    const initial = await listTemplateInfos(projectDir)
    expect(initial.every((item) => item.source === "builtin")).toBe(true)

    const templateDir = path.join(projectDir, ".opencode", "opencode-spec", "templates")
    await mkdir(templateDir, { recursive: true })
    await writeFile(path.join(templateDir, "proposal.md"), "# Custom Proposal\n", "utf8")

    const updated = await listTemplateInfos(projectDir)
    expect(updated.find((item) => item.name === "proposal")?.source).toBe("project")
  })

  it("bulk-archive 会同时返回成功与失败结果", async () => {
    const projectDir = await makeTempDir("opencode-spec-p3-")
    await initializeOpenSpec({ projectDir })

    await proposeChange({
      projectDir,
      name: "Batch Success",
      tasks: `# Tasks: batch-success

## Implementation
- [x] 1.1 完成实现

## Verification
- [x] 2.1 完成验证

## Verification Notes
- 已完成验证
`,
    })

    await proposeChange({
      projectDir,
      name: "Batch Failure",
      tasks: `# Tasks: batch-failure

## Implementation
- [ ] 1.1 尚未完成
`,
    })

    const result = await bulkArchiveChanges({
      projectDir,
      names: ["batch-success", "batch-failure"],
    })

    expect(result.archived).toHaveLength(1)
    expect(result.archived[0]?.slug).toBe("batch-success")
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0]?.name).toBe("batch-failure")
    expect(result.failed[0]?.error).toContain("归档失败")
    expect(await exists(path.join(projectDir, "openspec", "specs", "batch-success", "spec.md"))).toBe(true)
  })
})
