import type { SyncAssetsResult } from "./sync-assets.js"

type SessionNoticeVariant = "info" | "success" | "warning" | "error"

export interface SessionNotice {
  duration: number
  message: string
  title: string
  variant: SessionNoticeVariant
}

export function buildSessionNotice(result: SyncAssetsResult) {
  const parts = ["OpenSpec 工作流已启用"]

  if (result.writtenFiles.length > 0) {
    parts.push(`已同步 ${result.writtenFiles.length} 个资源文件`)
  }

  if (result.conflicts.length > 0) {
    parts.push(`检测到 ${result.conflicts.length} 个用户修改文件，已写入 .new 供人工合并`)
  }

  if (result.requiresRestart) {
    parts.push("commands/skills 已更新，建议重启 OpenCode 以重新发现")
  }

  parts.push("推荐流程：propose → design → tasks → apply → archive")

  const variant = result.conflicts.length > 0 ? "warning" : result.requiresRestart ? "info" : "success"

  return {
    duration: variant === "warning" ? 8000 : variant === "info" ? 6000 : 4000,
    title: "opencode-spec",
    message: parts.join("；"),
    variant,
  } satisfies SessionNotice
}
