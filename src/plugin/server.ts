import type { Plugin } from "@opencode-ai/plugin"
import path from "node:path"

import { getOpenspecDir, setOpenspecDir } from "../util/paths.js"
import { initPrompts } from "./prompts.js"
import { initBootstrap, getBootstrapContent } from "./bootstrap.js"
import { loadCommands } from "./commands.js"
import { setupSkillsDir } from "./skills.js"

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
    const envDir = process.env.OPENSPEC_DIR?.trim()
    if (envDir) {
      setOpenspecDir(envDir)
    }

    if (options?.directory && typeof options.directory === "string" && options.directory.trim()) {
      const dir = options.directory.trim()
      if (!process.env.OPENSPEC_DIR?.trim()) {
        setOpenspecDir(dir)
        process.env.OPENSPEC_DIR = dir
      }
    }

    const sourceSkillsDir = path.join(packageRoot, "assets", "skills")
    const commandsDir = path.join(packageRoot, "assets", "commands")
    const skillsDir = await setupSkillsDir(sourceSkillsDir)

    const projectDir = ctx.worktree || ctx.directory

    await initPrompts(packageRoot, projectDir)
    await initBootstrap()

    return {
      /**
       * 配置钩子：将 OpenSpec 的 skills 目录和 slash commands 注入到 OpenCode 配置中
       */
      config: async (rawConfig) => {
        const config = rawConfig as Record<string, any>

        if (getOpenspecDir() === "openspec") {
          const openspecConfig = config.openspec as Record<string, any> | undefined
          if (openspecConfig?.directory && typeof openspecConfig.directory === "string" && openspecConfig.directory.trim()) {
            const dir = openspecConfig.directory.trim()
            if (!process.env.OPENSPEC_DIR?.trim()) {
              setOpenspecDir(dir)
              process.env.OPENSPEC_DIR = dir
            }
          }
        }

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
