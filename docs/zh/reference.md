# 参考文档

[返回 README](../../README.md) | [English](../en/reference.md)

本文档汇总 `opencode-spec` 提供的 commands、skills 与工作流。

## Commands

- `/opsx-propose`
- `/opsx-explore`
- `/opsx-apply`
- `/opsx-archive`
- `/opsx-new-change`（别名 `/opsx-new`）
- `/opsx-continue-change`（别名 `/opsx-continue`）
- `/opsx-ff-change`（别名 `/opsx-ff`）
- `/opsx-update-change`（别名 `/opsx-update`）
- `/opsx-sync-specs`（别名 `/opsx-sync`）
- `/opsx-verify-change`（别名 `/opsx-verify`）
- `/opsx-bulk-archive`
- `/opsx-onboard`

## Skills

| Skill | 说明 | 内置脚本 |
|-------|------|---------|
| `openspec-propose` | 创建 change 并生成 artifacts | new-change.js, status.js, instructions.js |
| `openspec-explore` | 探索问题、澄清需求 | list.js |
| `openspec-apply` | 执行实现并标记任务 | prepare-apply.js, mark-tasks.js |
| `openspec-archive` | 归档完成的 change | archive.js |
| `openspec-new-change` | 逐步启动 change | 复用 propose 脚本 |
| `openspec-continue-change` | 创建下一个 artifact | 复用 propose 脚本 |
| `openspec-ff-change` | 按依赖顺序生成规划文件 | 复用 propose 脚本 |
| `openspec-update-change` | 修订现有规划文件 | 复用 status/instructions 脚本 |
| `openspec-sync-specs` | 合并 delta 到主规格 | Agent 处理，复用 status 脚本 |
| `openspec-verify-change` | 核对实现与 artifacts | 复用 apply 脚本 |
| `openspec-bulk-archive-change` | 批量归档 | 复用 archive 脚本 |
| `openspec-onboard` | 引导完整工作流 | 复用核心脚本 |

## 工作流

```
propose → apply → archive
explore（可选，随时使用）
```

## 注入机制

OpenCode V2 插件在运行时注册 commands 和 skills，不向项目 `.opencode/` 目录写入集成文件：

- **commands**：解析 `assets/commands/*.md` 后通过 `ctx.command.transform` 注册
- **skills**：复制到系统临时目录、改写路径后通过 `ctx.skill.transform` 注册；插件卸载时清理

前置条件：**OpenCode 所使用的 shell 必须能直接执行 `node`**。

SKILL.md 中的 `.opencode/skills/` 脚本占位符会在运行时替换为带引号的临时路径，并为每次调用传递所属项目的 `OPENSPEC_DIR`，无需项目目录存在对应文件。
