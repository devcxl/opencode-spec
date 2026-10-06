import type { Plugin } from "@opencode/plugin"
import path from "node:path"

import { loadBootstrap } from "./bootstrap.js"
import { loadCommands } from "./commands.js"
import { cleanupSkillsDir, loadSkills, renderScriptCalls, setupSkillsDir } from "./skills.js"

/** OpenSpec 默认输出目录名 */
const DEFAULT_DIRECTORY = "openspec"

/**
 * 解析 OpenSpec 输出目录：OPENSPEC_DIR 环境变量 > options.directory > 默认值。
 *
 * 不再写入 process.env，避免同一 OpenCode 进程内多个 workspace 互相串用目录名。
 * 目录通过 command 模板中的内联环境变量传递给独立 node 参考脚本。
 */
function resolveDirectory(ctx: Plugin.Context): string {
  const envDir = process.env.OPENSPEC_DIR?.trim()
  const optionDir = ctx.options.directory
  const directory = envDir || (typeof optionDir === "string" && optionDir.trim()) || DEFAULT_DIRECTORY
  if (path.isAbsolute(directory) || path.win32.isAbsolute(directory) || directory.split(/[\\/]/).includes("..") || directory.includes("\0")) {
    throw new Error("OpenSpec directory 必须是项目内的相对路径")
  }
  return directory
}

/**
 * OpenSpec 插件工厂函数
 *
 * @param packageRoot - 插件包根目录，用于定位 assets 资源。
 *
 * 在 setup 中注册：
 * 1. skill transform - 注入 12 个 OpenSpec skills
 * 2. command transform - 注入 12 个 slash commands（用户同名命令优先，不覆盖）
 * 3. session context hook - 在模型请求前注入 bootstrap 提示
 */
export function createOpencodeSpec(packageRoot: string) {
  return async (ctx: Plugin.Context): Promise<() => Promise<void>> => {
    const directory = resolveDirectory(ctx)

    const sourceSkillsDir = path.join(packageRoot, "assets", "skills")
    const sourceTemplatesDir = path.join(packageRoot, "assets", "templates")
    const commandsDir = path.join(packageRoot, "assets", "commands")
    const skillsDir = await setupSkillsDir(sourceSkillsDir, sourceTemplatesDir, directory)

    try {
      const bootstrap = await loadBootstrap(packageRoot, ctx.location.project.directory)

      const skills = await loadSkills(skillsDir)
      await ctx.skill.transform((editor) => {
        for (const skill of skills) editor.add(skill)
      })

      // 用户已配置的同名 command 优先：先读取当前注册表，跳过已存在的名字
      const existingCommands = new Set((await ctx.command.list()).data.map((command) => command.name))
      const commands = loadCommands(commandsDir, skillsDir)
      await ctx.command.transform((editor) => {
        for (const command of commands) {
          if (existingCommands.has(command.name)) continue
          editor.add({
            name: command.name,
            description: command.description,
            execute: async ({ sessionID, prompt, delivery }) => {
              if (command.agent) await ctx.session.switchAgent({ sessionID, agent: command.agent })
              const text = renderScriptCalls(command.template, skillsDir, directory).replaceAll(
                "$ARGUMENTS",
                () => prompt.text.trim(),
              )
              await ctx.session.prompt({ ...prompt, sessionID, text, delivery })
            },
          })
        }
      })

      await ctx.session.hook("context", (event) => {
        if (event.system.some((part) => part.text.includes("EXTREMELY_IMPORTANT"))) return
        event.system.push({ type: "text", text: bootstrap })
      })
      return () => cleanupSkillsDir(skillsDir)
    } catch (error) {
      try {
        await cleanupSkillsDir(skillsDir)
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "Plugin setup and cleanup failed")
      }
      throw error
    }
  }
}
