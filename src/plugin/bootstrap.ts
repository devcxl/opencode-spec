import { loadPrompt } from "./prompts.js"

let _bootstrapCache: string | undefined

export async function initBootstrap() {
  const content = await loadPrompt("bootstrap")
  _bootstrapCache = content || undefined
}

export function resetBootstrap() {
  _bootstrapCache = undefined
}

// Source of truth: DEFAULT_PROMPTS.bootstrap in prompts.ts
const FALLBACK = `<EXTREMELY_IMPORTANT>
OpenSpec 工作流已启用。

你可以使用以下 slash commands：
- /opsx-propose <变更名> — 创建完整的 proposal/specs/design/tasks
- /opsx-apply <变更名> — 执行 tasks 实现变更
- /opsx-archive <变更名> — 归档已完成变更
- /opsx-explore <主题> — 需求澄清与方案探索

推荐流程：proposal → specs → design → tasks → apply → archive
</EXTREMELY_IMPORTANT>`

export function getBootstrapContent(): string {
  if (_bootstrapCache === undefined) {
    return FALLBACK
  }

  return _bootstrapCache
}
