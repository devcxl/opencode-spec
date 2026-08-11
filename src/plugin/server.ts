import type { Plugin } from "@opencode-ai/plugin"
import path from "node:path"

import { setOpenspecDir } from "../util/paths.js"
import { initPrompts } from "./prompts.js"
import { initBootstrap, getBootstrapContent } from "./bootstrap.js"
import { loadCommands } from "./commands.js"
import { setupSkillsDir } from "./skills.js"

/**
 * 应用一个目录候选值（env > options > config 优先级）
 *
 * - env 一旦设置即锁定，后续候选值（options / config）均被忽略
 * - 生效时同步写入 process.env.OPENSPEC_DIR，供参考脚本（独立 node 进程）读取
 */
function applyDirectoryCandidate(candidate: unknown): void {
  if (process.env.OPENSPEC_DIR?.trim()) return
  if (typeof candidate !== "string") return
  const trimmed = candidate.trim()
  if (!trimmed) return
  setOpenspecDir(trimmed)
  process.env.OPENSPEC_DIR = trimmed
}

/**
 * OpenSpec 插件工厂函数
 *
 * @param packageRoot - 插件包根目录，用于定位 assets 资源。
 *
 * 注册两个钩子：
 * 1. config - 在启动时注入 skills 路径和 slash commands，并读取 openspec.directory 配置
 * 2. experimental.chat.messages.transform - 在每条用户消息前插入 bootstrap 提示
 */
export function createOpencodeSpec(packageRoot: string): Plugin {
  return async (ctx, options) => {
    // 优先级：env > options > config > default
    // env 一旦存在即锁定；规范化（去空格）后写入 env，保持与 applyDirectoryCandidate 一致
    const envDir = process.env.OPENSPEC_DIR?.trim()
    if (envDir) {
      setOpenspecDir(envDir)
      if (process.env.OPENSPEC_DIR !== envDir) {
        process.env.OPENSPEC_DIR = envDir
      }
    }
    applyDirectoryCandidate(options?.directory)

    const sourceSkillsDir = path.join(packageRoot, "assets", "skills")
    const sourceTemplatesDir = path.join(packageRoot, "assets", "templates")
    const commandsDir = path.join(packageRoot, "assets", "commands")
    const skillsDir = await setupSkillsDir(sourceSkillsDir, sourceTemplatesDir)

    const projectDir = ctx.worktree || ctx.directory

    await initPrompts(packageRoot, projectDir)
    await initBootstrap()

    return {
      /**
       * 配置钩子：将 OpenSpec 的 skills 目录和 slash commands 注入到 OpenCode 配置中
       */
      config: async (rawConfig) => {
        const config = rawConfig as Record<string, any>

        // config 最低优先级（env / options 已设置时被忽略）
        applyDirectoryCandidate(config.openspec?.directory)

        config.skills = config.skills || {}
        config.skills.paths = config.skills.paths || []
        if (!config.skills.paths.includes(skillsDir)) {
          config.skills.paths.push(skillsDir)
        }

        config.command = config.command || {}
        for (const cmd of loadCommands(commandsDir, skillsDir)) {
          if (config.command[cmd.name]) continue
          config.command[cmd.name] = {
            template: cmd.template,
            description: cmd.description,
            agent: cmd.agent,
            model: cmd.model,
            subtask: cmd.subtask,
          }
        }
      },

      /**
       * 消息转换钩子：在第一条用户消息前插入 bootstrap 提示
       *
       * 如果 bootstrap 已存在（如已被其他插件或历史注入），则跳过。
       */
      "experimental.chat.messages.transform": async (_input, output) => {
        const bootstrap = getBootstrapContent()
        if (!output.messages.length) return

        const firstUser = output.messages.find(m => m.info.role === "user")
        if (!firstUser || !firstUser.parts.length) return

        if (firstUser.parts.some(p => p.type === "text" && p.text.includes("EXTREMELY_IMPORTANT"))) return

        firstUser.parts.unshift({ type: "text", text: bootstrap } as typeof firstUser.parts[number])
      },
    }
  }
}
