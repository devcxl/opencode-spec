import type { Plugin } from "@opencode-ai/plugin"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { buildSessionNotice } from "./bootstrap/inject-context.js"
import { syncAssets } from "./bootstrap/sync-assets.js"

export function resolvePackageRoot(metaUrl: string) {
  return path.resolve(path.dirname(fileURLToPath(metaUrl)), "..")
}

const packageRoot = resolvePackageRoot(import.meta.url)

function extractAndStripFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: {} as Record<string, string>, content }

  const frontmatterStr = match[1]
  const body = match[2]
  const frontmatter: Record<string, string> = {}

  for (const line of frontmatterStr.split("\n")) {
    const colonIdx = line.indexOf(":")
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "")
      frontmatter[key] = value
    }
  }

  return { frontmatter, content: body }
}

interface CommandConfig {
  template?: string
  description?: string
  agent?: string
  model?: string
  subtask?: boolean
}

interface PluginConfig {
  skills?: { paths?: string[] }
  command?: Record<string, CommandConfig>
}

interface ParsedCommand {
  name: string
  description?: string
  agent?: string
  model?: string
  subtask?: boolean
  template: string
}

let _commandsCache: ParsedCommand[] | undefined
let _bootstrapCache: string | undefined

export function _resetCaches() {
  _commandsCache = undefined
  _bootstrapCache = undefined
}

// 同步读取：仅插件初始化时调用一次，且有缓存，对事件循环的阻塞可接受
function loadCommands(commandsDir: string): ParsedCommand[] {
  if (_commandsCache !== undefined) return _commandsCache

  if (!fs.existsSync(commandsDir)) {
    _commandsCache = []
    return _commandsCache
  }

  const parsed: ParsedCommand[] = []

  for (const file of fs.readdirSync(commandsDir)) {
    if (!file.endsWith(".md")) continue

    const name = path.basename(file, ".md")
    const raw = fs.readFileSync(path.join(commandsDir, file), "utf8")
    const { frontmatter, content } = extractAndStripFrontmatter(raw)

    parsed.push({
      name,
      description: frontmatter.description,
      agent: frontmatter.agent,
      model: frontmatter.model,
      subtask: frontmatter.subtask === "true" ? true : frontmatter.subtask === "false" ? false : undefined,
      template: content.trim(),
    })
  }

  _commandsCache = parsed
  return _commandsCache
}

function getBootstrapContent(): string {
  if (_bootstrapCache !== undefined) return _bootstrapCache

  _bootstrapCache = `<EXTREMELY_IMPORTANT>
OpenSpec 工作流已启用。

你可以使用以下 slash commands：
- /opsx-propose <变更名> — 创建完整的 proposal/specs/design/tasks
- /opsx-apply <变更名> — 执行 tasks 实现变更
- /opsx-archive <变更名> — 归档已完成变更
- /opsx-explore <主题> — 需求澄清与方案探索

推荐流程：proposal → specs → design → tasks → apply → archive
</EXTREMELY_IMPORTANT>`

  return _bootstrapCache
}

export const OpencodeSpec: Plugin = async (ctx) => {
  const projectDir = ctx.worktree || ctx.directory
  const syncResult = await syncAssets({ packageRoot, projectDir })

  const commandsDir = path.join(packageRoot, "assets", "commands")
  const skillsDir = path.join(packageRoot, "assets", "skills")

  return {
    config: async (rawConfig) => {
      const config = rawConfig as PluginConfig

      config.skills = config.skills || {}
      config.skills.paths = config.skills.paths || []
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir)
      }

      config.command = config.command || {}
      for (const cmd of loadCommands(commandsDir)) {
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

    event: async ({ event }) => {
      if (event.type === "session.created" && (syncResult.changed || syncResult.conflicts.length > 0)) {
        const notice = buildSessionNotice(syncResult)
        const body = {
          duration: notice.duration,
          title: notice.title,
          message: notice.message,
          variant: notice.variant,
        }

        if (typeof ctx.client.tui?.showToast === "function") {
          try {
            await ctx.client.tui.showToast({ body })
            return
          } catch (error) {
            await ctx.client.app.log({
              body: {
                service: "opencode-spec",
                level: "warn",
                message: "显示启动提示失败，已降级为应用日志。",
                extra: {
                  error: error instanceof Error ? error.message : String(error),
                },
              },
            })
          }
        }

        await ctx.client.app.log({
          body: {
            service: "opencode-spec",
            level: notice.variant === "warning" ? "warn" : "info",
            message: notice.message,
            extra: {
              duration: notice.duration,
              title: notice.title,
              variant: notice.variant,
            },
          },
        })
      }
    },

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
