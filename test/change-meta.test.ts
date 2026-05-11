import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  archiveChange,
  initializeOpenSpec,
  proposeChange,
  resolveChangeMeta,
  updateProposal,
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

describe("OpenSpec change metadata", () => {
  it("proposeChange 在 proposal.md 写入 frontmatter 元数据", async () => {
    const projectDir = await makeTempDir("opencode-spec-meta-")

    await initializeOpenSpec({ projectDir })
    await proposeChange({ projectDir, name: "Add Audit Log" })

    const proposal = await readFile(path.join(projectDir, "openspec", "changes", "add-audit-log", "proposal.md"), "utf8")
    expect(proposal).toMatch(/^---\nslug: "add-audit-log"\ncreatedAt: ".+"\n---\n\n# Proposal: add-audit-log/m)

    const meta = await resolveChangeMeta(projectDir, "add-audit-log")
    expect(meta.slug).toBe("add-audit-log")
    expect(meta.schema).toBe("spec-driven")
    expect(meta.status).toBe("active")
    expect(meta.createdAt).toBeTruthy()
    expect(meta.updatedAt).toBeTruthy()
  })

  it("proposal.md 缺少 frontmatter 时严格报错", async () => {
    const projectDir = await makeTempDir("opencode-spec-meta-")

    await initializeOpenSpec({ projectDir })
    const changeDirPath = path.join(projectDir, "openspec", "changes", "legacy-change")
    await mkdir(path.join(changeDirPath, "specs"), { recursive: true })
    await writeFile(path.join(changeDirPath, "proposal.md"), "# Proposal\n", "utf8")
    await writeFile(path.join(changeDirPath, "design.md"), "# Design\n", "utf8")
    await writeFile(path.join(changeDirPath, "tasks.md"), "# Tasks\n", "utf8")
    await writeFile(path.join(changeDirPath, "specs", "spec.md"), "# Spec\n", "utf8")

    await expect(resolveChangeMeta(projectDir, "legacy-change")).rejects.toThrow(/缺少 frontmatter/)
  })

  it("updateProposal 保留 createdAt 并更新 proposal.md", async () => {
    const projectDir = await makeTempDir("opencode-spec-meta-")

    await initializeOpenSpec({ projectDir })
    await proposeChange({ projectDir, name: "Updated At Test" })

    const beforeMeta = await resolveChangeMeta(projectDir, "updated-at-test")

    await updateProposal({
      projectDir,
      name: "updated-at-test",
      content: "# Proposal: updated-at-test\n\n## Summary\nUpdated.",
    })

    const afterMeta = await resolveChangeMeta(projectDir, "updated-at-test")
    expect(afterMeta.slug).toBe("updated-at-test")
    expect(afterMeta.status).toBe("active")
    expect(afterMeta.createdAt).toBe(beforeMeta.createdAt)
    expect(new Date(afterMeta.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeMeta.updatedAt).getTime())
  })

  it("archive 后 resolveChangeMeta 仍能定位并返回 archived 状态", async () => {
    const projectDir = await makeTempDir("opencode-spec-meta-")

    await initializeOpenSpec({ projectDir })
    const proposed = await proposeChange({
      projectDir,
      name: "Archive Metadata",
      tasks: `# Tasks: archive-metadata

## Implementation
- [x] 1.1 完成实现

## Verification
- [x] 2.1 完成验证

## Verification Notes
- 已验证
`,
    })

    await archiveChange({ projectDir, name: proposed.slug })

    const archivedMeta = await resolveChangeMeta(projectDir, proposed.slug)
    expect(archivedMeta.status).toBe("archived")
    expect(archivedMeta.archivedAt).toBeTruthy()
  })
})
