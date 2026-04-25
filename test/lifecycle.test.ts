import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  archiveChange,
  createChangeScaffold,
  initializeOpenSpec,
  listChanges,
  proposeChange,
  syncChangeSpecs,
  validateChange,
  verifyChange,
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

describe("OpenSpec lifecycle", () => {
  it("validate 会在非严格模式下返回 warning", async () => {
    const projectDir = await makeTempDir("opencode-spec-lifecycle-")

    await initializeOpenSpec({ projectDir })
    await proposeChange({
      projectDir,
      name: "Validate Warning",
      tasks: "# Tasks: validate-warning\n\n## Implementation\n",
    })

    const result = await validateChange({ projectDir, name: "validate-warning" })
    expect(result.valid).toBe(true)
    expect(result.errors.some((message) => message.includes("不可识别的任务格式") || message.includes("重复") || message.includes("前导零"))).toBe(false)
    expect(result.warnings.some((message) => message.includes("没有可识别的任务项"))).toBe(true)
  })

  it("verify 会识别未完成任务与缺少验证说明", async () => {
    const projectDir = await makeTempDir("opencode-spec-lifecycle-")

    await initializeOpenSpec({ projectDir })
    await proposeChange({
      projectDir,
      name: "Verify Pending",
      tasks: `# Tasks: verify-pending

## Implementation
- [ ] 1.1 完成实现
`,
    })

    const result = await verifyChange({ projectDir, name: "verify-pending" })
    expect(result.readyToArchive).toBe(false)
    expect(result.pendingTaskIds).toEqual(["1.1"])
    expect(result.warnings.some((message) => message.includes("Verification Notes"))).toBe(true)
  })

  it("sync 会把 change specs 同步到 openspec/specs", async () => {
    const projectDir = await makeTempDir("opencode-spec-lifecycle-")

    await initializeOpenSpec({ projectDir })
    await proposeChange({ projectDir, name: "Sync Specs" })

    const result = await syncChangeSpecs({ projectDir, name: "sync-specs" })
    expect(result.syncedFiles).toContain("openspec/specs/sync-specs/spec.md")
    await expect(readFile(path.join(projectDir, "openspec", "specs", "sync-specs", "spec.md"), "utf8")).resolves.toContain("# Spec")
  })

  it("sync 会保留 nested specs 的 change 命名空间", async () => {
    const projectDir = await makeTempDir("opencode-spec-lifecycle-")

    await initializeOpenSpec({ projectDir })
    await proposeChange({ projectDir, name: "Nested Specs" })
    await mkdir(path.join(projectDir, "openspec", "changes", "nested-specs", "specs", "api"), { recursive: true })
    await writeFile(
      path.join(projectDir, "openspec", "changes", "nested-specs", "specs", "api", "login.md"),
      "# Login Spec\n",
      "utf8",
    )

    const result = await syncChangeSpecs({ projectDir, name: "nested-specs" })
    expect(result.syncedFiles).toContain("openspec/specs/nested-specs/spec.md")
    expect(result.syncedFiles).toContain("openspec/specs/nested-specs/api/login.md")
  })

  it("archive 会先同步 specs 再写入日期前缀归档目录", async () => {
    const projectDir = await makeTempDir("opencode-spec-lifecycle-")

    await initializeOpenSpec({ projectDir })
    await proposeChange({
      projectDir,
      name: "Archive Dated",
      tasks: `# Tasks: archive-dated

## Implementation
- [x] 1.1 完成实现

## Verification
- [x] 2.1 完成验证

## Verification Notes
- 已完成验证
`,
    })

    const result = await archiveChange({ projectDir, name: "archive-dated" })
    expect(result.archivedTo).toMatch(/openspec\/changes\/archive\/\d{4}-\d{2}-\d{2}-archive-dated/)
    expect(result.specsMergedTo).toContain("openspec/specs/archive-dated/spec.md")

    const archivedDirs = await readdir(path.join(projectDir, "openspec", "changes", "archive"))
    expect(archivedDirs.some((dir) => dir.endsWith("-archive-dated"))).toBe(true)
    expect(await exists(path.join(projectDir, "openspec", "specs", "archive-dated", "spec.md"))).toBe(true)
  })

  it("fresh scaffold 在 list 中应保持 in-progress", async () => {
    const projectDir = await makeTempDir("opencode-spec-lifecycle-")

    await initializeOpenSpec({ projectDir })
    await createChangeScaffold({ projectDir, name: "Fresh Scaffold" })

    const list = await listChanges({ projectDir })
    expect(list.active[0]?.name).toBe("fresh-scaffold")
    expect(list.active[0]?.status).toBe("in-progress")
  })
})
