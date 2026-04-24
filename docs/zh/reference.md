# 参考文档

[返回 README](../../README.md) | [English](../en/reference.md)

本文档汇总 `opencode-spec` 提供的 tools、commands 与推荐工作流。

## Tools

- `openspec-init`
- `openspec-propose`
- `openspec-design`
- `openspec-tasks`
- `openspec-apply`
- `openspec-archive`
- `openspec-list`

## Commands

- `/opsx-propose`
- `/opsx-design`
- `/opsx-tasks`
- `/opsx-apply`
- `/opsx-archive`
- `/opsx-list`

## 推荐工作流

推荐顺序：

1. `propose`
2. `design`
3. `tasks`
4. `apply`
5. `archive`

建议理解为：

- `propose`：定义变更目标与范围
- `design`：补充设计方案与取舍
- `tasks`：把变更拆成可执行任务
- `apply`：按任务推进实现并回写状态
- `archive`：在验证完成后归档变更

## 资源同步位置

插件启动后会同步以下资源：

- `assets/commands/*` → `.opencode/commands/*`
- `assets/skills/*` → `.opencode/skills/*`
- `assets/templates/*` → `.opencode/opencode-spec/templates/*`

如果 commands 或 skills 首次写入，或发生升级，建议重启 OpenCode。
