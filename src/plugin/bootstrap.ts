/** bootstrap 消息缓存 */
let _bootstrapCache: string | undefined

/**
 * 生成每次对话注入的 bootstrap 提示消息
 *
 * 该消息告知用户 OpenSpec 工作流已启用以及可用的 slash command。
 */
export function getBootstrapContent(): string {
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
