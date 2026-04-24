import { afterEach, describe, expect, it, vi } from "vitest"

const { syncAssets, createOpenSpecTools } = vi.hoisted(() => ({
  syncAssets: vi.fn(),
  createOpenSpecTools: vi.fn(() => ({})),
}))

vi.mock("../src/bootstrap/sync-assets.js", () => ({
  syncAssets,
}))

vi.mock("../src/tools/index.js", () => ({
  createOpenSpecTools,
}))

import { buildSessionNotice } from "../src/bootstrap/inject-context.js"
import { OpencodeSpec } from "../src/plugin.js"

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe("buildSessionNotice", () => {
  it("在存在冲突时生成 warning toast", () => {
    expect(
      buildSessionNotice({
        changed: true,
        conflicts: ["skills/openspec/SKILL.md"],
        requiresRestart: true,
        skippedFiles: ["skills/openspec/SKILL.md"],
        version: "0.1.0",
        writtenFiles: [".opencode/skills/openspec/SKILL.md.new"],
      }),
    ).toEqual({
      duration: 8000,
      title: "opencode-spec",
      message:
        "OpenSpec 工作流已启用；已同步 1 个资源文件；检测到 1 个用户修改文件，已写入 .new 供人工合并；commands/skills 已更新，建议重启 OpenCode 以重新发现；推荐流程：propose → design → tasks → apply → archive",
      variant: "warning",
    })
  })
})

describe("OpencodeSpec", () => {
  it("在 session.created 时通过 TUI toast 展示同步提示", async () => {
    syncAssets.mockResolvedValue({
      changed: true,
      conflicts: [],
      requiresRestart: true,
      skippedFiles: [],
      version: "0.1.0",
      writtenFiles: [".opencode/skills/openspec/SKILL.md"],
    })

    const showToast = vi.fn().mockResolvedValue(true)
    const appLog = vi.fn().mockResolvedValue(true)

    const plugin = await OpencodeSpec({
      client: {
        app: {
          log: appLog,
        },
        tui: {
          showToast,
        },
      },
      directory: "/tmp/project",
      worktree: "/tmp/project",
    } as never)

    await plugin.event?.({
      event: { type: "session.created" },
    } as never)

    expect(showToast).toHaveBeenCalledWith({
      body: {
        duration: 6000,
        title: "opencode-spec",
        message:
          "OpenSpec 工作流已启用；已同步 1 个资源文件；commands/skills 已更新，建议重启 OpenCode 以重新发现；推荐流程：propose → design → tasks → apply → archive",
        variant: "info",
      },
    })
    expect(appLog).not.toHaveBeenCalled()
  })

  it("toast 失败时降级为应用日志而不是抛错", async () => {
    syncAssets.mockResolvedValue({
      changed: true,
      conflicts: [],
      requiresRestart: false,
      skippedFiles: [],
      version: "0.1.0",
      writtenFiles: [".opencode/commands/opsx-propose.md"],
    })

    const showToast = vi.fn().mockRejectedValue(new Error("toast unavailable"))
    const appLog = vi.fn().mockResolvedValue(true)

    const plugin = await OpencodeSpec({
      client: {
        app: {
          log: appLog,
        },
        tui: {
          showToast,
        },
      },
      directory: "/tmp/project",
      worktree: "/tmp/project",
    } as never)

    await expect(
      plugin.event?.({
        event: { type: "session.created" },
      } as never),
    ).resolves.toBeUndefined()

    expect(appLog).toHaveBeenNthCalledWith(1, {
      body: {
        service: "opencode-spec",
        level: "warn",
        message: "显示启动提示失败，已降级为应用日志。",
        extra: {
          error: "toast unavailable",
        },
      },
    })
    expect(appLog).toHaveBeenNthCalledWith(2, {
      body: {
        service: "opencode-spec",
        level: "info",
        message: "OpenSpec 工作流已启用；已同步 1 个资源文件；推荐流程：propose → design → tasks → apply → archive",
        extra: {
          duration: 4000,
          title: "opencode-spec",
          variant: "success",
        },
      },
    })
  })

  it("没有同步变化时不展示提示", async () => {
    syncAssets.mockResolvedValue({
      changed: false,
      conflicts: [],
      requiresRestart: false,
      skippedFiles: [],
      version: "0.1.0",
      writtenFiles: [],
    })

    const showToast = vi.fn().mockResolvedValue(true)
    const appLog = vi.fn().mockResolvedValue(true)

    const plugin = await OpencodeSpec({
      client: {
        app: {
          log: appLog,
        },
        tui: {
          showToast,
        },
      },
      directory: "/tmp/project",
      worktree: "/tmp/project",
    } as never)

    await plugin.event?.({
      event: { type: "session.created" },
    } as never)

    expect(showToast).not.toHaveBeenCalled()
    expect(appLog).not.toHaveBeenCalled()
  })
})
