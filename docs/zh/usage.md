# 使用指南

[返回 README](../../README.md) | [English](../en/usage.md)

本文档给出 `opencode-spec` 的推荐使用方式，适合首次接入和日常使用时参考。

## 1. 安装插件

在项目根目录配置 `opencode.json`：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-spec"]
}
```

启动 OpenCode 后，插件会自动同步：

- `.opencode/commands/opsx-*.md`
- `.opencode/skills/openspec/SKILL.md`
- `.opencode/opencode-spec/templates/*.md`

如果 commands 或 skills 首次写入，或发生升级，建议重启 OpenCode。

## 2. 初始化目录结构

首次在项目中启用 OpenSpec 时，先使用 `openspec-init` 创建基础目录和文件结构。

## 3. 按工作流推进

推荐顺序：

1. `propose`
2. `design`
3. `tasks`
4. `apply`
5. `archive`

### propose

用于定义本次变更的目标、边界和预期收益。

### design

用于记录实现方案、约束、替代方案和关键取舍。

### tasks

用于把设计拆成一组可执行、可验证、可追踪的任务。

### apply

用于在执行实现后回写任务状态，持续维护变更进度。

### archive

用于在实现和验证都完成之后归档本次变更。

## 4. 选择 tools 还是 commands

### 适合使用 tools 的场景

- 你希望明确控制输入参数
- 你已经知道要调用哪个 OpenSpec 步骤
- 你更偏向结构化调用而不是对话式工作流

### 适合使用 commands 的场景

- 你希望 Agent 按预设提示组织输出
- 你希望沿用仓库内已有流程模板
- 你更偏向对话式、提示词驱动的工作方式

## 5. 处理同步冲突

如果插件检测到你手动改过已同步文件，它不会直接覆盖，而是生成 `.new` 文件。

建议处理方式：

1. 对比原文件与 `.new` 文件
2. 合并你需要保留的内容
3. 删除不再需要的 `.new` 文件
4. 如 commands / skills 有更新，重启 OpenCode

## 6. 常见建议

- 把 `propose → design → tasks` 作为进入实现前的固定准备动作
- 如果只改模板，可重点检查 `.opencode/opencode-spec/templates`
- 如果只改 commands 或 skills，同步后优先重启 OpenCode 再验证
