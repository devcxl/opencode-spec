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
        console.log(buildSessionNotice(syncResult))
      }
    },
    tool: createOpenSpecTools(),
  }
}
