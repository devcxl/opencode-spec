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

| Skill | 说明 | 统一 CLI 子命令 |
|-------|------|---------|
| `openspec-propose` | 创建 change 并生成 artifacts | `new-change`、`status`、`instructions` |
| `openspec-explore` | 探索问题、澄清需求 | `list` |
| `openspec-apply` | 执行实现并标记任务 | `prepare-apply`、`mark-tasks` |
| `openspec-archive` | 归档完成的 change | `archive` |
| `openspec-new-change` | 逐步启动 change | 复用 propose 子命令 |
| `openspec-continue-change` | 创建下一个 artifact | 复用 propose 子命令 |
| `openspec-ff-change` | 按依赖顺序生成规划文件 | 复用 propose 子命令 |
| `openspec-update-change` | 修订现有规划文件 | 复用 `status`、`instructions` |
| `openspec-sync-specs` | 合并 delta 到主规格 | Agent 处理，复用 `status` |
| `openspec-verify-change` | 核对实现与 artifacts | 复用 apply 子命令 |
| `openspec-bulk-archive-change` | 批量归档 | 复用 `list`、`archive` |
| `openspec-onboard` | 引导完整工作流 | 复用核心子命令 |

所有操作统一通过插件包内的 Node 入口 `assets/skills/_shared/references/openspec-cli.js` 执行。

## 工作流

```
propose → apply → archive
explore（可选，随时使用）
```

## 注入机制

OpenCode V2 插件在运行时注册 commands 和 skills，不向项目 `.opencode/` 目录写入集成文件：

- **commands**：解析 `assets/commands/*.md` 后通过 `ctx.command.transform` 注册
- **skills**：直接从插件包读取，在内存中改写脚本路径后通过 `ctx.skill.transform` 注册；不创建临时副本

前置条件：**OpenCode 所使用的 shell 必须能直接执行 `node`**。

SKILL.md 中的 `.opencode/skills/` 脚本占位符会在注册时替换为带引号的包内路径，并为每次调用传递所属项目的 `OPENSPEC_DIR`，无需在项目目录安装对应文件。
