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

## 注入机制

插件通过 `config` hook 在运行时注入 commands 和 skills，不向项目 `.opencode/` 目录写入文件：

- **commands**：解析 `assets/commands/*.md` 后直接注册到 `config.command`
- **skills**：复制 `assets/skills/` 到系统临时目录，路径占位符替换后通过 `config.skills.paths` 注册

前置条件：**OpenCode 所使用的 shell 必须能直接执行 `node`**。

Skill 的 SKILL.md 中引用脚本使用 `.opencode/skills/` 作为路径占位符，运行时会被替换为临时目录实际路径，无需项目目录中存在对应文件。
