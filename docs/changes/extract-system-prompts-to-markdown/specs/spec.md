# Spec: extract-system-prompts-to-markdown

## Requirements

1. bootstrap 消息必须从 `assets/prompts/bootstrap.md` 加载，而非硬编码
2. 提供 `loadPrompt(name)` 函数，按优先级查找：项目覆盖 > 插件内置
3. `loadPrompt` 在文件不存在时必须返回合理的默认内容（兜底）
4. 保留 `getBootstrapContent()` 的对外接口签名不变，调用方不受影响
5. 项目覆盖目录路径：`.opencode/opencode-spec/prompts/<name>.md`

## Behavior

- `loadPrompt("bootstrap")` 先查找项目目录下的 `.opencode/opencode-spec/prompts/bootstrap.md`
  - 存在则返回其内容
  - 不存在则回退到 `assets/prompts/bootstrap.md`
  - 插件内置文件也不存在时，返回内置默认字符串（硬编码兜底）
- `src/plugin/bootstrap.ts` 改为调用 `loadPrompt("bootstrap")`
- 清理：`src/plugin/bootstrap.ts` 中的硬编码字符串移至 `assets/prompts/bootstrap.md`

## Acceptance Criteria

1. `assets/prompts/bootstrap.md` 文件存在，内容与原 hardcode 一致
2. `loadPrompt("bootstrap")` 在无项目覆盖时返回 `assets/prompts/bootstrap.md` 内容
3. 项目 `.opencode/opencode-spec/prompts/bootstrap.md` 存在时可覆盖内置内容
4. `getBootstrapContent()` 行为不变，结果与之前一致
5. 所有现有测试通过
