import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  archiveChange,
  initializeOpenSpec,
  listChanges,
  prepareApply,
  proposeChange,
  updateDesign,
  updateTasks,
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

describe("OpenSpec core workflow", () => {
  it("初始化目录结构", async () => {
    const projectDir = await makeTempDir("opencode-spec-core-")

    const result = await initializeOpenSpec({ projectDir })

    expect(result.created).toContain("openspec/specs")
    expect(result.created).toContain("openspec/changes")
    expect(result.created).toContain("openspec/changes/archive")
  })

  it("支持 propose → design → tasks → apply → archive 全流程", async () => {
    const projectDir = await makeTempDir("opencode-spec-core-")

    await initializeOpenSpec({ projectDir })
    const proposed = await proposeChange({ projectDir, name: "Add Dark Mode" })

    expect(proposed.slug).toBe("add-dark-mode")
    expect(await exists(path.join(projectDir, "openspec", "changes", "add-dark-mode", "proposal.md"))).toBe(true)
    expect(await exists(path.join(projectDir, "openspec", "changes", "add-dark-mode", "design.md"))).toBe(true)
    expect(await exists(path.join(projectDir, "openspec", "changes", "add-dark-mode", "tasks.md"))).toBe(true)
    expect(await exists(path.join(projectDir, "openspec", "changes", "add-dark-mode", "specs", "spec.md"))).toBe(true)

    const initialTasksContent = await readFile(
      path.join(projectDir, "openspec", "changes", "add-dark-mode", "tasks.md"),
      "utf8",
    )
    expect(initialTasksContent).not.toContain("任务 ID 必须使用纯数字分段格式")
    expect(initialTasksContent).toContain("- [ ] 1.1 完成实现")

    await updateDesign({
      projectDir,
      name: proposed.slug,
      content: "# Design: add-dark-mode\n\n## Technical Approach\nUse CSS variables.",
    })

    await updateTasks({
      projectDir,
      name: proposed.slug,
      content: `# Tasks: add-dark-mode

## Implementation
- [ ] 1.1 Add theme state
- [ ] 1.2 Wire theme toggle

## Verification
- [ ] 2.1 Run unit tests
`,
    })

    const applyResult = await prepareApply({
      projectDir,
      name: proposed.slug,
      completeTaskIds: ["1.1", "2.1"],
      verificationSummary: "已执行单元测试。",
    })

    expect(applyResult.completedTaskIds).toEqual(["1.1", "2.1"])
    expect(applyResult.pendingTaskIds).toEqual(["1.2"])

    await expect(archiveChange({ projectDir, name: proposed.slug })).rejects.toThrow(/未完成/)

    await prepareApply({
      projectDir,
      name: proposed.slug,
      completeTaskIds: ["1.2"],
      verificationSummary: "手工检查通过。",
    })

    const archived = await archiveChange({ projectDir, name: proposed.slug })
    expect(archived.archivedTo).toContain(path.join("openspec", "changes", "archive", "add-dark-mode"))
    expect(await exists(path.join(projectDir, "openspec", "specs", "add-dark-mode", "spec.md"))).toBe(true)

    const list = await listChanges({ projectDir })
    expect(list.active).toHaveLength(0)
    expect(list.archived).toHaveLength(1)
    expect(list.archived[0]?.name).toBe("add-dark-mode")

    const tasksContent = await readFile(
      path.join(projectDir, "openspec", "changes", "archive", "add-dark-mode", "tasks.md"),
      "utf8",
    )

    expect(tasksContent).toContain("- [x] 1.1 Add theme state")
    expect(tasksContent).toContain("- [x] 1.2 Wire theme toggle")
    expect(tasksContent).toContain("## Verification Notes")
  })

  it("updateTasks 会拒绝带前导零的任务 ID", async () => {
    const projectDir = await makeTempDir("opencode-spec-core-")

    await initializeOpenSpec({ projectDir })
    const proposed = await proposeChange({ projectDir, name: "Reject Leading Zero Task IDs" })

    await expect(
      updateTasks({
        projectDir,
        name: proposed.slug,
        content: `# Tasks: reject-leading-zero-task-ids

## Implementation
- [ ] 01.01 完成实现

## Verification
- [ ] 02.01 完成验证
`,
      }),
    ).rejects.toThrow(/前导零/)
  })

  it("proposeChange 会拒绝显式传入的前导零任务 ID", async () => {
    const projectDir = await makeTempDir("opencode-spec-core-")

    await initializeOpenSpec({ projectDir })

    await expect(
      proposeChange({
        projectDir,
        name: "Reject Leading Zero In Propose",
        tasks: `# Tasks: reject-leading-zero-in-propose

## Implementation
- [ ] 01.01 完成实现
`,
      }),
    ).rejects.toThrow(/前导零/)
  })

  it("updateTasks 会拒绝非机器任务 ID 格式", async () => {
    const projectDir = await makeTempDir("opencode-spec-core-")

    await initializeOpenSpec({ projectDir })
    const proposed = await proposeChange({ projectDir, name: "Reject Invalid Task IDs" })

    await expect(
      updateTasks({
        projectDir,
        name: proposed.slug,
        content: `# Tasks: reject-invalid-task-ids

## Implementation
- [ ] Step 1 完成实现
`,
      }),
    ).rejects.toThrow(/机器任务 ID 格式/)
  })

  it("updateTasks 会拒绝重复的机器任务 ID", async () => {
    const projectDir = await makeTempDir("opencode-spec-core-")

    await initializeOpenSpec({ projectDir })
    const proposed = await proposeChange({ projectDir, name: "Reject Duplicate Task IDs" })

    await expect(
      updateTasks({
        projectDir,
        name: proposed.slug,
        content: `# Tasks: reject-duplicate-task-ids

## Implementation
- [ ] 1.1 完成实现
- [ ] 1.1 再次完成实现
`,
      }),
    ).rejects.toThrow(/重复的机器任务 ID/)
  })

  it("自定义非法 tasks 模板会在 propose 和 reset 时被拒绝", async () => {
    const projectDir = await makeTempDir("opencode-spec-core-")
    const templateDir = path.join(projectDir, ".opencode", "opencode-spec", "templates")

    await initializeOpenSpec({ projectDir })
    await mkdir(templateDir, { recursive: true })
    await writeFile(
      path.join(templateDir, "tasks.md"),
      `# Tasks: {{name}}

## Implementation
- [ ] 完成实现

## Verification
- [ ] 完成验证
`,
      "utf8",
    )

    await expect(proposeChange({ projectDir, name: "Invalid Template Tasks" })).rejects.toThrow(/机器任务 ID 格式/)

    const proposed = await proposeChange({
      projectDir,
      name: "Reset Invalid Template Tasks",
      tasks: `# Tasks: reset-invalid-template-tasks

## Implementation
- [ ] 1.1 完成实现
`,
    })

    await expect(updateTasks({ projectDir, name: proposed.slug })).rejects.toThrow(/机器任务 ID 格式/)
  })

  it("prepareApply 会拒绝已有文件中的前导零机器任务 ID", async () => {
    const projectDir = await makeTempDir("opencode-spec-core-")

    await initializeOpenSpec({ projectDir })
    const proposed = await proposeChange({ projectDir, name: "Reject Leading Zero In Apply" })

    await writeFile(
      path.join(projectDir, "openspec", "changes", proposed.slug, "tasks.md"),
      `# Tasks: reject-leading-zero-in-apply

## Implementation
- [ ] 01.01 完成实现
`,
      "utf8",
    )

    await expect(
      prepareApply({
        projectDir,
        name: proposed.slug,
        completeTaskIds: ["1.1"],
      }),
    ).rejects.toThrow(/前导零/)
  })
})
