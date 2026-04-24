export function formatToolResult(result: unknown) {
  return JSON.stringify(result, null, 2)
}

export function resolveProjectDir(context: { directory: string; worktree?: string | null }) {
  return context.worktree || context.directory
}
