# Tasks: extract-system-prompts-to-markdown

## Implementation
- [x] 1.1 新建 `assets/prompts/bootstrap.md`，内容为原 bootstrap 硬编码字符串
- [x] 1.2 新建 `src/plugin/prompts.ts`，实现 `loadPrompt(name)` 函数（三级回退：项目覆盖 → 内置文件 → 兜底默认）
- [x] 1.3 改造 `src/plugin/bootstrap.ts`：移除硬编码字符串，改为调用 `loadPrompt("bootstrap")`
- [x] 1.4 更新 `src/plugin/server.ts`：将 `packageRoot` 传递给 bootstrap 模块用于解析内置 prompt 路径

## Verification
- [x] 2.1 单元测试覆盖 `loadPrompt` 的三级回退逻辑
- [x] 2.2 单元测试覆盖 `getBootstrapContent()` 返回值正确
- [x] 2.3 运行 `npm run typecheck` 无错误
- [x] 2.4 运行 `npm test` 全部通过

## Verification Notes
- typecheck 通过，6 个新测试通过（loadPrompt 三级回退 + getBootstrapContent），69/71 测试通过（2 个失败为 reference-scripts 既存问题，与改动无关）
