import path from "node:path"
import { access } from "node:fs/promises"

import { afterEach, describe, expect, it } from "vitest"

import type { Plugin } from "@opencode/plugin"

import { createOpencodeSpec } from "../src/plugin/server.js"

const repoRoot = path.resolve(__dirname, "..")

interface RegisteredCommand {
  name: string
  description?: string
  execute: (input: {
    sessionID: string
    prompt: { text: string; files?: unknown[]; agents?: unknown[]; skills?: unknown[] }
    delivery: "steer" | "queue"
  }) => Promise<void>
}

interface RegisteredSkill {
  id: string
  name: string
  description?: string
  path: string
  content: string
}

interface FakeState {
  commands: Map<string, RegisteredCommand>
  skills: Map<string, RegisteredSkill>
  hooks: Record<string, Array<(event: any) => void | Promise<void>>>
  prompts: Array<Record<string, any>>
  switchedAgents: Array<{ sessionID: string; agent: string }>
}

function makeContext(options: {
  directory?: string
  existingCommands?: string[]
  projectDirectory?: string
} = {}) {
  const state: FakeState = {
    commands: new Map(),
    skills: new Map(),
    hooks: {},
    prompts: [],
    switchedAgents: [],
  }

  const projectDirectory = options.projectDirectory ?? "/project"
  const location = {
    directory: projectDirectory,
    project: { id: "project", directory: projectDirectory, canonical: projectDirectory },
  }

  const context = {
    location,
    options: options.directory === undefined ? {} : { directory: options.directory },
    command: {
      list: async () => ({
        location,
        data: (options.existingCommands ?? []).map((name) => ({ name })),
      }),
      transform: async (callback: (editor: { add: (definition: RegisteredCommand) => void }) => void) => {
        callback({ add: (definition) => state.commands.set(definition.name, definition) })
        return { dispose: async () => {} }
      },
    },
    skill: {
      list: async () => ({ location, data: [...state.skills.values()] }),
      transform: async (callback: (editor: { add: (skill: RegisteredSkill) => void }) => void) => {
        callback({ add: (skill) => state.skills.set(skill.id, skill) })
        return { dispose: async () => {} }
      },
    },
    session: {
      hook: async (name: string, callback: (event: any) => void | Promise<void>) => {
        ;(state.hooks[name] ??= []).push(callback)
        return { dispose: async () => {} }
      },
      prompt: async (input: Record<string, any>) => {
        state.prompts.push(input)
        return {}
      },
      switchAgent: async (input: { sessionID: string; agent: string }) => {
        state.switchedAgents.push(input)
      },
    },
  }

  return { context: context as unknown as Plugin.Context, state }
}

async function setup(options: Parameters<typeof makeContext>[0] = {}) {
  const { context, state } = makeContext(options)
  const setupFn = createOpencodeSpec(repoRoot)
  await setupFn(context)
  return state
}

async function exists(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false
    throw error
  }
}

async function runCommand(state: FakeState, name: string, text: string) {
  const command = state.commands.get(name)
  if (!command) throw new Error(`command not registered: ${name}`)
  await command.execute({ sessionID: "session-1", prompt: { text }, delivery: "queue" })
  return state.prompts.at(-1)!
}

afterEach(() => {
  delete process.env.OPENSPEC_DIR
})

describe("OpencodeSpec v2 skills registration", () => {
  it("注册全部 12 个 skills", async () => {
    const state = await setup()
    expect(state.skills.size).toBe(12)
    expect(state.skills.has("openspec-propose")).toBe(true)
    expect(state.skills.has("openspec-onboard")).toBe(true)
  })

  it("解析 frontmatter、剥离 frontmatter 并重写 .opencode/skills/ 路径", async () => {
    const state = await setup()
    const skill = state.skills.get("openspec-propose")!

    expect(skill.name).toBe("openspec-propose")
    expect(skill.description).toContain("Propose a new change")
    expect(skill.content).not.toContain("name: openspec-propose")
    expect(skill.content).not.toContain(".opencode/skills/")
    expect(skill.content).toContain(path.dirname(skill.path))
    expect(path.basename(skill.path)).toBe("SKILL.md")
  })
})

describe("OpencodeSpec v2 commands registration", () => {
  it("注册全部 12 个 commands", async () => {
    const state = await setup()
    expect(state.commands.size).toBe(12)
    expect(state.commands.has("opsx-propose")).toBe(true)
    expect(state.commands.get("opsx-propose")!.description).toContain("planning artifacts")
  })

  it("执行 command 时渲染 $ARGUMENTS、替换 skills 路径并切换 agent", async () => {
    const state = await setup()
    const prompt = await runCommand(state, "opsx-propose", "my-change")

    expect(prompt.text).toContain("my-change")
    expect(prompt.text).not.toContain("$ARGUMENTS")
    expect(prompt.text).not.toContain(".opencode/skills/")
    expect(prompt.delivery).toBe("queue")
    expect(state.switchedAgents).toEqual([{ sessionID: "session-1", agent: "build" }])
  })

  it("不覆盖用户已存在的同名 command", async () => {
    const state = await setup({ existingCommands: ["opsx-propose"] })
    expect(state.commands.has("opsx-propose")).toBe(false)
    expect(state.commands.size).toBe(11)
  })
})

describe("OpencodeSpec v2 directory resolution", () => {
  it("默认目录为 openspec 并注入 OPENSPEC_DIR", async () => {
    const state = await setup()
    const prompt = await runCommand(state, "opsx-propose", "c")
    expect(prompt.text).toContain("OPENSPEC_DIR='openspec' node ")
  })

  it("options.directory 生效且不写入 process.env", async () => {
    const state = await setup({ directory: "my-spec-dir" })
    const prompt = await runCommand(state, "opsx-propose", "c")
    expect(prompt.text).toContain("OPENSPEC_DIR='my-spec-dir' node ")
    expect(state.skills.get("openspec-propose")!.content).toContain("OPENSPEC_DIR='my-spec-dir' node ")
    expect(process.env.OPENSPEC_DIR).toBeUndefined()
  })

  it("不同项目的技能脚本各自使用本项目目录", async () => {
    const first = await setup({ directory: "first-specs" })
    const second = await setup({ directory: "second-specs" })

    expect(first.skills.get("openspec-propose")!.content).toContain("OPENSPEC_DIR='first-specs' node ")
    expect(second.skills.get("openspec-propose")!.content).toContain("OPENSPEC_DIR='second-specs' node ")
  })

  it("插件卸载后删除临时技能目录", async () => {
    const { context, state } = makeContext()
    const cleanup = await createOpencodeSpec(repoRoot)(context)
    const skillsDir = path.dirname(path.dirname(state.skills.get("openspec-propose")!.path))

    expect(await exists(skillsDir)).toBe(true)
    expect(cleanup).toBeTypeOf("function")
    await cleanup!()
    expect(await exists(skillsDir)).toBe(false)
  })

  it("OPENSPEC_DIR 环境变量优先于 options.directory", async () => {
    process.env.OPENSPEC_DIR = "env-spec-dir"
    const state = await setup({ directory: "options-dir" })
    const prompt = await runCommand(state, "opsx-propose", "c")
    expect(prompt.text).toContain("OPENSPEC_DIR='env-spec-dir' node ")
  })

  it("拒绝会把工作流数据写到项目外的目录", async () => {
    await expect(setup({ directory: "../outside" })).rejects.toThrow("相对路径")
    process.env.OPENSPEC_DIR = "/outside"
    await expect(setup()).rejects.toThrow("相对路径")
  })
})

describe("OpencodeSpec v2 bootstrap hook", () => {
  it("向 session context 注入 bootstrap system part", async () => {
    const state = await setup()
    const hook = state.hooks["context"]?.[0]
    expect(hook).toBeDefined()

    const event = { system: [] as Array<{ type: string; text: string }>, messages: [] }
    await hook!(event)

    expect(event.system.length).toBe(1)
    expect(event.system[0].text).toContain("EXTREMELY_IMPORTANT")
    expect(event.system[0].text).toContain("opsx-propose")
  })

  it("已存在 EXTREMELY_IMPORTANT 时不重复注入", async () => {
    const state = await setup()
    const hook = state.hooks["context"]![0]
    const event = {
      system: [{ type: "text", text: "<EXTREMELY_IMPORTANT>\nalready\n</EXTREMELY_IMPORTANT>" }],
      messages: [],
    }
    await hook(event)
    expect(event.system.length).toBe(1)
  })
})
