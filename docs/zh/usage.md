# 使用指南

[返回 README](../../README.md) | [English](../en/usage.md)

本文档给出 `opencode-spec` 的推荐使用方式。

## 1. 安装插件

在项目根目录配置 `opencode.json`：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@devcxl/opencode-spec"]
}
```

## 2. 工作流

```
propose → apply → archive
explore（可选，随时使用）
```

### propose

创建 change 并生成 proposal / specs / design / tasks。

### explore

探索问题、澄清需求。不实现任何功能。

### apply

按 tasks 执行实现，完成后标记任务完成。

### archive

归档已完成的 change。

## 3. 入口选择

| 类型 | 入口 | 说明 |
|------|------|------|
| Command | `/opsx-propose` | 推荐起始点 |
| Command | `/opsx-explore` | 需求探索 |
| Command | `/opsx-apply` | 任务执行 |
| Command | `/opsx-archive` | 归档完成 |
| Skill | `openspec-propose` | Agent 直接调用 |
| Skill | `openspec-explore` | Agent 直接调用 |
| Skill | `openspec-apply` | Agent 直接调用 |
| Skill | `openspec-archive` | Agent 直接调用 |

## 4. 内置参考脚本

每个 skill 内置 JavaScript 脚本，位于 `.opencode/skills/<skill-name>/references/`：

- `openspec-propose`：new-change.js、status.js、instructions.js
- `openspec-explore`：list.js
- `openspec-apply`：prepare-apply.js、mark-tasks.js
- `openspec-archive`：archive.js

这些脚本替代外部 openspec CLI，直接操作 `openspec/` 目录结构。

## 5. 处理同步冲突

如果插件检测到文件被用户改过，不会覆盖，而是生成 `.new` 文件。

建议：

1. 对比原文件与 `.new` 文件
2. 合并需要保留的内容
3. 删除 `.new` 文件
4. 如有更新，重启 OpenCode
