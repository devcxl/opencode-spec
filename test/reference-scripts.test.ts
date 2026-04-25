import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { afterEach, describe, expect, it } from "vitest"

const execFileAsync = promisify(execFile)
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

async function createWorkspace() {
  const projectDir = await makeTempDir("opencode-spec-scripts-project-")
  const skillRoot = path.join(projectDir, ".opencode", "skills")

  await mkdir(path.join(skillRoot, "openspec-propose", "references"), { recursive: true })
  await mkdir(path.join(skillRoot, "openspec-apply", "references"), { recursive: true })
  await mkdir(path.join(skillRoot, "openspec-archive", "references"), { recursive: true })
  await mkdir(path.join(skillRoot, "openspec-explore", "references"), { recursive: true })
  await mkdir(path.join(skillRoot, "_shared", "references"), { recursive: true })

  const repoRoot = "/home/devcxl/Projects/OpenCodePlugins/opencode-spec"
  const files = [
    ["assets/skills/package.json", ".opencode/skills/package.json"],
    ["assets/skills/_shared/references/openspec.js", ".opencode/skills/_shared/references/openspec.js"],
    ["assets/skills/openspec-propose/references/new-change.js", ".opencode/skills/openspec-propose/references/new-change.js"],
    ["assets/skills/openspec-propose/references/status.js", ".opencode/skills/openspec-propose/references/status.js"],
    ["assets/skills/openspec-propose/references/instructions.js", ".opencode/skills/openspec-propose/references/instructions.js"],
    ["assets/skills/openspec-apply/references/prepare-apply.js", ".opencode/skills/openspec-apply/references/prepare-apply.js"],
    ["assets/skills/openspec-apply/references/mark-tasks.js", ".opencode/skills/openspec-apply/references/mark-tasks.js"],
    ["assets/skills/openspec-archive/references/archive.js", ".opencode/skills/openspec-archive/references/archive.js"],
    ["assets/skills/openspec-explore/references/list.js", ".opencode/skills/openspec-explore/references/list.js"],
  ] as const

  for (const [source, target] of files) {
    const content = await readFile(path.join(repoRoot, source), "utf8")
    const targetPath = path.join(projectDir, target)
    await mkdir(path.dirname(targetPath), { recursive: true })
    await writeFile(targetPath, content, "utf8")
  }

  return projectDir
}

async function runJson(projectDir: string, scriptRelativePath: string, args: string[] = []) {
  const scriptPath = path.join(projectDir, scriptRelativePath)
  const { stdout } = await execFileAsync("node", [scriptPath, ...args], { cwd: projectDir })
  return JSON.parse(stdout) as Record<string, unknown>
}

describe("reference scripts", () => {
  it("new-change 与 status 能在同步目录下正常工作", async () => {
    const projectDir = await createWorkspace()

    const created = await runJson(projectDir, ".opencode/skills/openspec-propose/references/new-change.js", ["Demo Change"])
    expect(created.slug).toBe("demo-change")
    expect(await exists(path.join(projectDir, "openspec", "changes", "demo-change", ".openspec.yaml"))).toBe(true)

    const status = await runJson(projectDir, ".opencode/skills/openspec-propose/references/status.js", ["demo-change", "--json"])
    expect(status.slug).toBe("demo-change")
    expect((status.artifacts as Array<{ id: string; state: string }>).find((artifact) => artifact.id === "proposal")?.state).toBe("ready")
  })

  it("mark-tasks 会按机器任务 ID 勾选正确任务，并写入验证说明", async () => {
    const projectDir = await createWorkspace()
    await runJson(projectDir, ".opencode/skills/openspec-propose/references/new-change.js", ["Task Change"])

    const baseDir = path.join(projectDir, "openspec", "changes", "task-change")
    await writeFile(path.join(baseDir, "proposal.md"), "# Proposal\n", "utf8")
    await writeFile(path.join(baseDir, "design.md"), "# Design\n", "utf8")
    await writeFile(path.join(baseDir, "specs", "spec.md"), "# Spec\n", "utf8")
    await writeFile(
      path.join(baseDir, "tasks.md"),
      "# Tasks\n\n## Implementation\n- [ ] 1.1 第一项\n- [ ] 1.2 第二项\n",
      "utf8",
    )

    const result = await runJson(projectDir, ".opencode/skills/openspec-apply/references/mark-tasks.js", [
      "--change=task-change",
      "--complete-ids=1.2",
      "--verification-summary=已跑单测",
    ])

    expect(result.pendingTaskIds).toEqual(["1.1"])
    const tasksContent = await readFile(path.join(baseDir, "tasks.md"), "utf8")
    expect(tasksContent).toContain("- [ ] 1.1 第一项")
    expect(tasksContent).toContain("- [x] 1.2 第二项")
    expect(tasksContent).toContain("## Verification Notes")
    expect(tasksContent).toContain("- 已跑单测")
  })

  it("archive 会同步 specs 并写入带日期前缀的归档目录", async () => {
    const projectDir = await createWorkspace()
    await runJson(projectDir, ".opencode/skills/openspec-propose/references/new-change.js", ["Archive Change"])

    const baseDir = path.join(projectDir, "openspec", "changes", "archive-change")
    await writeFile(path.join(baseDir, "proposal.md"), "# Proposal\n", "utf8")
    await writeFile(path.join(baseDir, "design.md"), "# Design\n", "utf8")
    await writeFile(path.join(baseDir, "specs", "spec.md"), "# Spec\n", "utf8")
    await writeFile(
      path.join(baseDir, "tasks.md"),
      "# Tasks\n\n## Implementation\n- [x] 1.1 完成实现\n\n## Verification\n- [x] 2.1 完成验证\n\n## Verification Notes\n- 已验证\n",
      "utf8",
    )

    const archived = await runJson(projectDir, ".opencode/skills/openspec-archive/references/archive.js", ["--change=archive-change"])
    expect(String(archived.archivedTo)).toMatch(/openspec\/changes\/archive\/\d{4}-\d{2}-\d{2}-archive-change/)
    expect(archived.specsMergedTo).toEqual(["openspec/specs/archive-change/spec.md"])
    expect(await exists(path.join(projectDir, "openspec", "specs", "archive-change", "spec.md"))).toBe(true)
  })
})
