import type { Plugin } from "@opencode-ai/plugin"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { buildSessionNotice } from "./bootstrap/inject-context.js"
import { syncAssets } from "./bootstrap/sync-assets.js"
import { createOpenSpecTools } from "./tools/index.js"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export const OpencodeSpec: Plugin = async (ctx) => {
  const projectDir = ctx.worktree || ctx.directory
  const syncResult = await syncAssets({ packageRoot, projectDir })

  return {
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
    tool: createOpenSpecTools(),
  }
}
