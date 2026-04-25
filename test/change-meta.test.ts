import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  archiveChange,
  initializeOpenSpec,
  proposeChange,
  readChangeMeta,
  resolveChangeMeta,
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

describe("OpenSpec change metadata", () => {
  it("proposeChange 会创建并可读取 metadata", async () => {
    const projectDir = await makeTempDir("opencode-spec-meta-")

    await initializeOpenSpec({ projectDir })
    await proposeChange({ projectDir, name: "Add Audit Log" })

    const metaPath = path.join(projectDir, "openspec", "changes", "add-audit-log", ".openspec.yaml")
    expect(await exists(metaPath)).toBe(true)

    const meta = await readChangeMeta(projectDir, "add-audit-log")
    expect(meta).not.toBeNull()
    expect(meta?.slug).toBe("add-audit-log")
    expect(meta?.schema).toBe("spec-driven")
    expect(meta?.status).toBe("active")

    const raw = await readFile(metaPath, "utf8")
    expect(raw).toContain("slug: add-audit-log")
  })

  it("旧 change 缺少 metadata 时 resolveChangeMeta 仍能推断", async () => {
    const projectDir = await makeTempDir("opencode-spec-meta-")

    await initializeOpenSpec({ projectDir })
    const changeDir = path.join(projectDir, "openspec", "changes", "legacy-change")
    await mkdir(path.join(changeDir, "specs"), { recursive: true })
    await writeFile(path.join(changeDir, "proposal.md"), "# Proposal\n", "utf8")
    await writeFile(path.join(changeDir, "design.md"), "# Design\n", "utf8")
    await writeFile(path.join(changeDir, "tasks.md"), "# Tasks\n", "utf8")
    await writeFile(path.join(changeDir, "specs", "spec.md"), "# Spec\n", "utf8")

    const meta = await resolveChangeMeta(projectDir, "legacy-change")
    expect(meta.slug).toBe("legacy-change")
    expect(meta.schema).toBe("spec-driven")
    expect(meta.status).toBe("active")
  })

  it("旧 change 更新后会自动回填 metadata", async () => {
    const projectDir = await makeTempDir("opencode-spec-meta-")

    await initializeOpenSpec({ projectDir })
    const changeDir = path.join(projectDir, "openspec", "changes", "legacy-backfill")
    await mkdir(path.join(changeDir, "specs"), { recursive: true })
    await writeFile(path.join(changeDir, "proposal.md"), "# Proposal\n", "utf8")
    await writeFile(path.join(changeDir, "design.md"), "# Design\n", "utf8")
    await writeFile(path.join(changeDir, "tasks.md"), "# Tasks\n\n## Implementation\n- [ ] 1.1 完成实现\n", "utf8")
    await writeFile(path.join(changeDir, "specs", "spec.md"), "# Spec\n", "utf8")

    await updateTasks({
      projectDir,
      name: "legacy-backfill",
      content: `# Tasks: legacy-backfill

## Implementation
- [ ] 1.1 完成实现
`,
    })

    const meta = await readChangeMeta(projectDir, "legacy-backfill")
    expect(meta).not.toBeNull()
    expect(meta?.slug).toBe("legacy-backfill")
    expect(meta?.status).toBe("active")
    expect(await exists(path.join(changeDir, ".openspec.yaml"))).toBe(true)
  })

  it("archive 后 metadata 会保留并标记 archived", async () => {
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
`,
    })

    await archiveChange({ projectDir, name: proposed.slug })

    const archivedMeta = await readChangeMeta(projectDir, proposed.slug)
    expect(archivedMeta).not.toBeNull()
    expect(archivedMeta?.status).toBe("archived")
    expect(archivedMeta?.archivedAt).toBeTruthy()

    const archiveRoot = path.join(projectDir, "openspec", "changes", "archive")
    const archivedDirs = await import("node:fs/promises").then(({ readdir }) => readdir(archiveRoot))
    const archivedDir = archivedDirs.find((dir) => dir.endsWith(`-${proposed.slug}`))
    expect(archivedDir).toBeTruthy()

    const archivedMetaPath = path.join(archiveRoot, archivedDir!, ".openspec.yaml")
    expect(await exists(archivedMetaPath)).toBe(true)
  })
})
