import type { SyncAssetsResult } from "./sync-assets.js"

export function buildSessionNotice(result: SyncAssetsResult) {
  const lines = ["[opencode-spec] OpenSpec 工作流已启用。"]

  if (result.writtenFiles.length > 0) {
    lines.push(`[opencode-spec] 已同步 ${result.writtenFiles.length} 个资源文件。`)
  }

  if (result.conflicts.length > 0) {
    lines.push(`[opencode-spec] 检测到 ${result.conflicts.length} 个用户修改文件，已写入 .new 供人工合并。`)
  }

  if (result.requiresRestart) {
    lines.push("[opencode-spec] commands/skills 已更新，建议重启 OpenCode 以重新发现。")
  }

  lines.push("[opencode-spec] 推荐流程：propose → design → tasks → apply → archive。")
  return lines.join("\n")
}
