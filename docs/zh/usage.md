# 使用指南

[返回 README](../../README.md) | [English](../en/usage.md)

本文档给出 `opencode-spec` 的推荐使用方式。

## 1. 安装插件

需要 OpenCode V2。在项目根目录配置 `opencode.json`：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@devcxl/opencode-spec"]
}
```

前置条件：**OpenCode 所使用的 shell 必须能直接执行 `node`**。

原因：skills 会调用 JavaScript 参考脚本，这些脚本通过 `node` 执行。

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

### 核心命令

| 类型 | 入口 | 说明 |
|------|------|------|
| Command | `/opsx-propose` | 推荐起始点：创建 change 与全部 planning artifacts |
| Command | `/opsx-explore` | 需求探索 |
| Command | `/opsx-apply` | 任务执行 |
| Command | `/opsx-archive` | 归档完成 |
| Skill | `openspec-propose` | Agent 直接调用 |
| Skill | `openspec-explore` | Agent 直接调用 |
| Skill | `openspec-apply` | Agent 直接调用 |
| Skill | `openspec-archive` | Agent 直接调用 |

### 扩展命令

| 类型 | 入口 | 说明 |
|------|------|------|
| Command | `/opsx-new-change` | 启动新变更，逐步创建 artifact |
| Command | `/opsx-continue-change` | 继续创建下一个 artifact |
| Command | `/opsx-ff-change` | 快速生成全部 planning artifacts |
| Command | `/opsx-update-change` | 更新 planning artifacts 并保持一致性 |
| Command | `/opsx-sync-specs` | 同步 delta specs 到 main specs |
| Command | `/opsx-verify-change` | 验证实现与 artifact 匹配 |
| Command | `/opsx-bulk-archive` | 批量归档多个变更 |
| Command | `/opsx-onboard` | 引导式完整工作流教学 |
| Skill | `openspec-new-change` | Agent 直接调用 |
| Skill | `openspec-continue-change` | Agent 直接调用 |
| Skill | `openspec-ff-change` | Agent 直接调用 |
| Skill | `openspec-update-change` | Agent 直接调用 |
| Skill | `openspec-sync-specs` | Agent 直接调用 |
| Skill | `openspec-verify-change` | Agent 直接调用 |
| Skill | `openspec-bulk-archive-change` | Agent 直接调用 |
| Skill | `openspec-onboard` | Agent 直接调用 |

## 4. 内置 Node CLI

所有 skill 都通过 `node` 执行插件包内的统一 CLI：`assets/skills/_shared/references/openspec-cli.js`：

- `list`
- `new-change <name>`、`status <name>`、`instructions <artifact-id> --change=<name>`
- `prepare-apply --change=<name>`、`mark-tasks --change=<name> ...`
- `archive --change=<name> ...`（包括 `--instructions` 模式）

CLI 将子命令分发到 `openspec.js` 中的共享工作流实现；它替代外部 OpenSpec CLI，不增加该依赖。扩展技能复用这些子命令。
