# 参考文档

[返回 README](../../README.md) | [English](../en/reference.md)

本文档汇总 `opencode-spec` 提供的 commands、skills 与工作流。

## Commands

- `/opsx-propose`
- `/opsx-explore`
- `/opsx-apply`
- `/opsx-archive`

## Skills

| Skill | 说明 | 内置脚本 |
|-------|------|---------|
| `openspec-propose` | 创建 change 并生成 artifacts | new-change.js, status.js, instructions.js |
| `openspec-explore` | 探索问题、澄清需求 | list.js |
| `openspec-apply` | 执行实现并标记任务 | prepare-apply.js, mark-tasks.js |
| `openspec-archive` | 归档完成的 change | archive.js |

## 工作流

```
propose → apply → archive
explore（可选，随时使用）
```

## 资源同步

插件启动后同步以下资源：

- `assets/commands/*` → `.opencode/commands/*`
- `assets/skills/*` → `.opencode/skills/*`
- `assets/templates/*` → `.opencode/opencode-spec/templates/*`

前置条件：**OpenCode 所使用的 shell 必须能直接执行 `node`**。

这些 reference scripts 通过项目根下的相对路径 `.opencode/skills/**/references/*.js` 调用。

如果 skills 首次写入或发生升级，建议重启 OpenCode。
