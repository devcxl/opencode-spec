import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { OpencodeSpec } from "../src/plugin.js"
import { getOpenspecDir, setOpenspecDir } from "../src/util/paths.js"

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  delete process.env.OPENSPEC_DIR
  setOpenspecDir("openspec")
})

async function makeTempDir() {
  const dir = await mkdtemp(path.join(tmpdir(), "opencode-spec-test-"))
  tempDirs.push(dir)
  return dir
}

async function exists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

describe("OpencodeSpec config hook", () => {
  it("注入 skills 目录到 config.skills.paths 并指向 temp 目录", async () => {
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose", "references"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: projectDir,
      worktree: projectDir,
    } as never)

    const config = {} as Record<string, any>
    await plugin.config?.(config)

    expect(config.skills).toBeDefined()
    expect(config.skills.paths).toBeInstanceOf(Array)
    expect(config.skills.paths.length).toBeGreaterThan(0)
    expect(config.skills.paths[0]).toContain("opencode-spec-skills-")
    expect(await exists(config.skills.paths[0])).toBe(true)
  })

  it("重复调用不会重复注入 skills 路径", async () => {
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: projectDir,
      worktree: projectDir,
    } as never)

    const config = { skills: { paths: [] as string[] } } as Record<string, any>
    await plugin.config?.(config)
    await plugin.config?.(config)

    expect(config.skills.paths.length).toBe(1)
  })

  it("注册的 skills 目录中 SKILL.md 的 .opencode/skills/ 路径被替换", async () => {
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose", "references"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))
    await writeFile(
      path.join(projectDir, "assets", "skills", "openspec-propose", "SKILL.md"),
      "---\nname: test\n---\nnode .opencode/skills/openspec-propose/references/script.js",
    )

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: projectDir,
      worktree: projectDir,
    } as never)

    const config = {} as Record<string, any>
    await plugin.config?.(config)

    const skillsDir = config.skills.paths[0]
    const skillContent = await readFile(
      path.join(skillsDir, "openspec-propose", "SKILL.md"),
      "utf8",
    )

    expect(skillContent).not.toContain(".opencode/skills/")
    expect(skillContent).toContain(skillsDir)
  })

  it("注入 command 配置并替换路径", async () => {
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose", "references"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))
    await writeFile(
      path.join(projectDir, "assets", "commands", "opsx-propose.md"),
      "---\ndescription: test\nagent: build\n---\nnode .opencode/skills/openspec-propose/references/test.js $ARGUMENTS",
    )

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: projectDir,
      worktree: projectDir,
    } as never)

    const config = {} as Record<string, any>
    await plugin.config?.(config)

    expect(config.command).toBeDefined()
    expect(config.command["opsx-propose"]).toBeDefined()
    expect(config.command["opsx-propose"].template).not.toContain(".opencode/skills/")
    expect(config.command["opsx-propose"].template).toContain(config.skills.paths[0])
    expect(config.command["opsx-propose"].agent).toBe("build")
  })

  it("不会覆盖已存在的 command", async () => {
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: projectDir,
      worktree: projectDir,
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
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: projectDir,
      worktree: projectDir,
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
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: projectDir,
      worktree: projectDir,
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
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))

    const plugin = await OpencodeSpec({
      client: {} as never,
      directory: projectDir,
      worktree: projectDir,
    } as never)

    await expect(
      plugin["experimental.chat.messages.transform"]?.({} as never, { messages: [] } as never),
    ).resolves.toBeUndefined()
  })
})

describe("OpencodeSpec custom directory option", () => {
  it("options.directory 设置后 getOpenspecDir 返回自定义值", async () => {
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))

    const plugin = await OpencodeSpec(
      { client: {} as never, directory: projectDir, worktree: projectDir } as never,
      { directory: "my-custom-dir" },
    )

    expect(getOpenspecDir()).toBe("my-custom-dir")
    expect(plugin).toBeDefined()
  })

  it("options.directory 为空字符串时保持默认值", async () => {
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))

    const plugin = await OpencodeSpec(
      { client: {} as never, directory: projectDir, worktree: projectDir } as never,
      { directory: "" },
    )

    expect(getOpenspecDir()).toBe("openspec")
    expect(plugin).toBeDefined()
  })

  it("options 未传入时保持默认值", async () => {
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))

    const plugin = await OpencodeSpec(
      { client: {} as never, directory: projectDir, worktree: projectDir } as never,
    )

    expect(getOpenspecDir()).toBe("openspec")
    expect(plugin).toBeDefined()
  })

  it("OPENSPEC_DIR 环境变量设置后 getOpenspecDir 返回环境变量值", async () => {
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))

    process.env.OPENSPEC_DIR = "env-spec-dir"
    try {
      const plugin = await OpencodeSpec(
        { client: {} as never, directory: projectDir, worktree: projectDir } as never,
      )
      expect(getOpenspecDir()).toBe("env-spec-dir")
      expect(plugin).toBeDefined()
    } finally {
      delete process.env.OPENSPEC_DIR
    }
  })

  it("环境变量优先级高于 options.directory", async () => {
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))

    process.env.OPENSPEC_DIR = "env-wins"
    try {
      const plugin = await OpencodeSpec(
        { client: {} as never, directory: projectDir, worktree: projectDir } as never,
        { directory: "options-dir" },
      )
      expect(getOpenspecDir()).toBe("env-wins")
      expect(process.env.OPENSPEC_DIR).toBe("env-wins")
      expect(plugin).toBeDefined()
    } finally {
      delete process.env.OPENSPEC_DIR
    }
  })

  it("环境变量优先级高于 config.openspec.directory", async () => {
    const projectDir = await makeTempDir()
    await mkdir(path.join(projectDir, "assets", "skills", "openspec-propose"), { recursive: true })
    await mkdir(path.join(projectDir, "assets", "commands"), { recursive: true })
    await writeFile(path.join(projectDir, "package.json"), JSON.stringify({ version: "0.1.0" }))

    process.env.OPENSPEC_DIR = "env-wins"
    try {
      const plugin = await OpencodeSpec(
        { client: {} as never, directory: projectDir, worktree: projectDir } as never,
      )
      const config = { openspec: { directory: "config-dir" } } as Record<string, any>
      await plugin.config?.(config)
      expect(getOpenspecDir()).toBe("env-wins")
      expect(process.env.OPENSPEC_DIR).toBe("env-wins")
    } finally {
      delete process.env.OPENSPEC_DIR
    }
  })
})
