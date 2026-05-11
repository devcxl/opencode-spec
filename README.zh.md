# opencode-spec

[![CI](https://github.com/devcxl/opencode-spec/actions/workflows/ci.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/ci.yml)
[![Release](https://github.com/devcxl/opencode-spec/actions/workflows/release.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/release.yml)
[![Publish to npm](https://github.com/devcxl/opencode-spec/actions/workflows/publish-npm.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/publish-npm.yml)

中文 | [English](README.en.md)

`opencode-spec` 是一个 OpenCode 插件，用于把 OpenSpec 风格的规格驱动开发流程接入 OpenCode。

插件通过 `config` hook 在运行时把 commands / skills 注册到 OpenCode，并在会话启动时注入工作流提示。

## 使用指南

### 1. 安装插件

在项目根目录的 `opencode.json` 中加入：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@devcxl/opencode-spec"]
}
```

前置条件：**OpenCode 所使用的 shell 必须能直接执行 `node`**。

原因：skills 会调用 JavaScript 参考脚本，这些脚本通过 `node` 执行。

### 2. 初始化 OpenSpec 目录

首次接入时，直接从 `/opsx-propose` 开始，或让 Agent 调用 `openspec-propose` skill；脚本会自动创建 OpenSpec 所需目录结构。

### 3. 按推荐流程推进变更

推荐工作流：

1. `propose`
2. `apply`
3. `archive`
4. `explore`（可选，随时使用）

建议这样理解：

- `propose`：创建 change，并生成 proposal / specs / design / tasks
- `apply`：按任务推进实现并回写状态
- `archive`：在验证完成后归档这次变更
- `explore`：只做需求澄清与方案探索，不实现功能

### 4. 选择使用入口

常用入口：

- **commands**：`/opsx-propose`、`/opsx-explore`、`/opsx-apply`、`/opsx-archive`
- **skills**：`openspec-propose`、`openspec-explore`、`openspec-apply`、`openspec-archive`

如果你希望：

- **让 Agent 按预设提示组织流程**：优先用 commands / skills
- **显式执行底层脚本**：skills 的 SKILL.md 中已内置脚本调用指引

### 5. 理解注入行为

插件通过 OpenCode 的 `config` hook 在运行时注入 commands 和 skills，**不向项目 `.opencode/` 目录写入任何文件**：

- **commands**：解析 `assets/commands/`，直接注册到 `config.command`，无需文件同步即可被 `/` 触发
- **skills**：将 `assets/skills/` 复制到系统临时目录（`/tmp`），替换 SKILL.md 中的路径占位符后，通过 `config.skills.paths` 注册；进程退出时临时目录自动清理
- **会话提示**：通过 `experimental.chat.messages.transform` hook 在首条用户消息中注入 OpenSpec 工作流引导

这意味着无需重启 OpenCode 即可立即使用 commands 和 skills。

详细使用示例见 [`docs/zh/usage.md`](docs/zh/usage.md)。

## 运行原理

这个插件的核心思路是“纯运行时注入”——不向项目目录同步文件，而是通过 `config` hook 在启动时注册所有能力：

- **commands 由 `config.command` 直接注册**，模板中引用脚本路径在解析时完成路径替换
- **skills 复制到 `/tmp` 临时目录后通过 `config.skills.paths` 注册**，进程退出时清理
- **引导消息在首条用户消息中注入**，告知可用命令和推荐流程

这样做的优势是隔离性强、无残留、升级即生效。

更详细的实现说明见 [`docs/zh/architecture.md`](docs/zh/architecture.md)。

## 本地开发

### 安装依赖

```bash
npm install
```

### 常用命令

```bash
npm test
npm run typecheck
npm run build
```

其中：

- `npm test`：运行 Vitest
- `npm run typecheck`：执行 TypeScript 类型检查
- `npm run build`：编译到 `dist/`

## 致谢

本项目的工作流设计受到 OpenSpec 启发。感谢 OpenSpec 提供清晰的规格驱动开发思路，让 `opencode-spec` 可以把这套流程更自然地接入 OpenCode。

## 文档索引

- [`README.en.md`](README.en.md)：English README
- [`docs/zh/usage.md`](docs/zh/usage.md)：中文使用指南
- [`docs/zh/reference.md`](docs/zh/reference.md)：中文参考文档
- [`docs/zh/architecture.md`](docs/zh/architecture.md)：中文实现原理
- [`docs/zh/release.md`](docs/zh/release.md)：中文发布文档
- [`docs/en/usage.md`](docs/en/usage.md)：English usage guide
- [`docs/en/reference.md`](docs/en/reference.md)：English reference
- [`docs/en/architecture.md`](docs/en/architecture.md)：English architecture
- [`docs/en/release.md`](docs/en/release.md)：English release guide
