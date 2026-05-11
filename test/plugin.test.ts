import { afterEach, describe, expect, it, vi } from "vitest"

const { syncAssets } = vi.hoisted(() => ({
  syncAssets: vi.fn(),
}))

vi.mock("../src/bootstrap/sync-assets.js", () => ({
  syncAssets,
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
        conflicts: ["skills/openspec/references/helper.js"],

        skippedFiles: ["skills/openspec/references/helper.js"],
        version: "0.1.0",
        writtenFiles: [".opencode/skills/openspec/references/helper.js.new"],
      }),
    ).toEqual({
      duration: 8000,
      title: "opencode-spec",
      message:
        "OpenSpec 工作流已启用；已同步 1 个脚本文件；检测到 1 个用户修改文件，已写入 .new 供人工合并；推荐流程：/opsx-propose → /opsx-apply → /opsx-archive",
      variant: "warning",
    })
  })

  it("无冲突时生成 success toast", () => {
    expect(
      buildSessionNotice({
        changed: true,
        conflicts: [],

        skippedFiles: [],
        version: "0.1.0",
        writtenFiles: [".opencode/skills/openspec/references/helper.js"],
      }),
    ).toEqual({
      duration: 4000,
      title: "opencode-spec",
      message:
        "OpenSpec 工作流已启用；已同步 1 个脚本文件；推荐流程：/opsx-propose → /opsx-apply → /opsx-archive",
      variant: "success",
    })
  })
})

describe("OpencodeSpec config hook", () => {
  it("注入 skills 目录到 config.skills.paths", async () => {
    syncAssets.mockResolvedValue({
      changed: false,
      conflicts: [],
      skippedFiles: [],
      version: "0.1.0",
      writtenFiles: [],
    })

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: "/tmp/project",
      worktree: "/tmp/project",
    } as never)

    const config = {} as Record<string, any>
    await plugin.config?.(config)

    expect(config.skills).toBeDefined()
    expect(config.skills.paths).toBeInstanceOf(Array)
    expect(config.skills.paths.length).toBeGreaterThan(0)
    expect(config.skills.paths[0]).toContain("assets/skills")
  })

  it("重复调用不会重复注入 skills 路径", async () => {
    syncAssets.mockResolvedValue({
      changed: false,
      conflicts: [],
      skippedFiles: [],
      version: "0.1.0",
      writtenFiles: [],
    })

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: "/tmp/project",
      worktree: "/tmp/project",
    } as never)

    const config = { skills: { paths: [] as string[] } } as Record<string, any>
    await plugin.config?.(config)
    await plugin.config?.(config)

    expect(config.skills.paths.length).toBe(1)
  })

  it("注入 command 配置", async () => {
    syncAssets.mockResolvedValue({
      changed: false,
      conflicts: [],
      skippedFiles: [],
      version: "0.1.0",
      writtenFiles: [],
    })

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: "/tmp/project",
      worktree: "/tmp/project",
    } as never)

    const config = {} as Record<string, any>
    await plugin.config?.(config)

    expect(config.command).toBeDefined()
    expect(config.command["opsx-propose"]).toBeDefined()
    expect(config.command["opsx-propose"].template).toBeTruthy()
    expect(config.command["opsx-propose"].description).toBeTruthy()
    expect(config.command["opsx-propose"].agent).toBe("build")

    expect(config.command["opsx-apply"]).toBeDefined()
    expect(config.command["opsx-archive"]).toBeDefined()
    expect(config.command["opsx-explore"]).toBeDefined()
  })

  it("不会覆盖已存在的 command", async () => {
    syncAssets.mockResolvedValue({
      changed: false,
      conflicts: [],
      skippedFiles: [],
      version: "0.1.0",
      writtenFiles: [],
    })

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: "/tmp/project",
      worktree: "/tmp/project",
    } as never)

    const config = {
      command: {
        "opsx-propose": { template: "user custom", description: "custom" },
      },
    } as Record<string, any>

    await plugin.config?.(config)

    expect(config.command["opsx-propose"].template).toBe("user custom")
  })
})

describe("OpencodeSpec messages transform", () => {
  it("在第一条 user message 前插入 bootstrap", async () => {
    syncAssets.mockResolvedValue({
      changed: false,
      conflicts: [],
      skippedFiles: [],
      version: "0.1.0",
      writtenFiles: [],
    })

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: "/tmp/project",
      worktree: "/tmp/project",
    } as never)

    const output = {
      messages: [
        {
          info: { role: "user" },
          parts: [{ type: "text", text: "帮我分析项目结构", metadata: {} }],
        },
      ],
    }

    await plugin["experimental.chat.messages.transform"]?.({} as never, output as never)

    expect(output.messages[0].parts.length).toBe(2)
    expect(output.messages[0].parts[0].text).toContain("EXTREMELY_IMPORTANT")
    expect(output.messages[0].parts[0].text).toContain("opsx-propose")
    expect(output.messages[0].parts[1].text).toBe("帮我分析项目结构")
  })

  it("已包含 EXTREMELY_IMPORTANT 时不重复注入", async () => {
    syncAssets.mockResolvedValue({
      changed: false,
      conflicts: [],
      skippedFiles: [],
      version: "0.1.0",
      writtenFiles: [],
    })

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: "/tmp/project",
      worktree: "/tmp/project",
    } as never)

    const output = {
      messages: [
        {
          info: { role: "user" },
          parts: [{ type: "text", text: "<EXTREMELY_IMPORTANT>\nalready injected\n</EXTREMELY_IMPORTANT>\n\n用户消息" }],
        },
      ],
    }

    await plugin["experimental.chat.messages.transform"]?.({} as never, output as never)

    expect(output.messages[0].parts.length).toBe(1)
  })

  it("无消息时不报错", async () => {
    syncAssets.mockResolvedValue({
      changed: false,
      conflicts: [],
      skippedFiles: [],
      version: "0.1.0",
      writtenFiles: [],
    })

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: "/tmp/project",
      worktree: "/tmp/project",
    } as never)

    await expect(
      plugin["experimental.chat.messages.transform"]?.({} as never, { messages: [] } as never),
    ).resolves.toBeUndefined()
  })
})

describe("OpencodeSpec session event", () => {
  it("在 session.created 时通过 TUI toast 展示同步提示", async () => {
    syncAssets.mockResolvedValue({
      changed: true,
      conflicts: [],
      skippedFiles: [],
      version: "0.1.0",
      writtenFiles: [".opencode/skills/openspec/references/helper.js"],
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
        duration: 4000,
        title: "opencode-spec",
        message:
          "OpenSpec 工作流已启用；已同步 1 个脚本文件；推荐流程：/opsx-propose → /opsx-apply → /opsx-archive",
        variant: "success",
      },
    })
    expect(appLog).not.toHaveBeenCalled()
  })

  it("toast 失败时降级为应用日志而不是抛错", async () => {
    syncAssets.mockResolvedValue({
      changed: true,
      conflicts: [],
      skippedFiles: [],
      version: "0.1.0",
      writtenFiles: [".opencode/skills/openspec/references/helper.js"],
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
        message:
          "OpenSpec 工作流已启用；已同步 1 个脚本文件；推荐流程：/opsx-propose → /opsx-apply → /opsx-archive",
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
