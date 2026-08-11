<div align="center">

# opencode-spec

[![CI](https://github.com/devcxl/opencode-spec/actions/workflows/build-verify.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/build-verify.yml)
[![Release](https://github.com/devcxl/opencode-spec/actions/workflows/create-release-tag.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/create-release-tag.yml)
[![Publish to npm](https://github.com/devcxl/opencode-spec/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/npm-publish.yml)
[![npm version](https://img.shields.io/npm/v/@devcxl/opencode-spec)](https://www.npmjs.com/package/@devcxl/opencode-spec)
[![npm downloads](https://img.shields.io/npm/dm/@devcxl/opencode-spec)](https://www.npmjs.com/package/@devcxl/opencode-spec)

中文 | [English](README.en.md)

`opencode-spec` 是一个 OpenCode 插件，用于把 OpenSpec 风格的规格驱动开发流程接入 OpenCode。

</div>

## 核心能力

插件通过 OpenCode 的 `config` hook 在运行时注入以下能力（不向项目 `.opencode/` 目录写入文件）：

- **commands**（12 个）：`/opsx-propose`、`/opsx-explore`、`/opsx-apply`、`/opsx-archive`、`/opsx-new-change`、`/opsx-continue-change`、`/opsx-ff-change`、`/opsx-update-change`、`/opsx-sync-specs`、`/opsx-verify-change`、`/opsx-bulk-archive`、`/opsx-onboard`
- **skills**（12 个）：`openspec-propose`、`openspec-explore`、`openspec-apply`、`openspec-archive` 及 8 个扩展技能（new-change / continue-change / ff-change / update-change / verify-change / sync-specs / bulk-archive-change / onboard）

每个 skill 内置 JavaScript 参考脚本，替代外部 openspec CLI。

## 安装

在项目根目录的 `opencode.json` 中加入：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@devcxl/opencode-spec"]
}
```

前置条件：**OpenCode 所使用的 shell 必须能直接执行 `node`**。

## 配置

OpenSpec 默认输出到项目根下的 `openspec/` 目录。如需自定义，使用 plugin 元组格式传入 `directory` 选项：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@devcxl/opencode-spec", { "directory": "docs" }]
  ]
}
```

也可通过环境变量 `OPENSPEC_DIR` 指定，优先级高于配置。

## 工作流

```
propose → apply → archive
explore（可选，随时使用）
```

**核心命令**

| 命令 | Skill | 功能 |
|------|-------|------|
| `/opsx-propose` | `openspec-propose` | 创建 change 并生成 proposal/specs/design/tasks |
| `/opsx-explore` | `openspec-explore` | 探索问题、澄清需求 |
| `/opsx-apply` | `openspec-apply` | 按 tasks 执行实现 |
| `/opsx-archive` | `openspec-archive` | 归档完成的 change |

**扩展命令**

| 命令 | Skill | 功能 |
|------|-------|------|
| `/opsx-new-change` | `openspec-new-change` | 启动新变更，逐步创建 artifact |
| `/opsx-continue-change` | `openspec-continue-change` | 继续创建下一个 artifact |
| `/opsx-ff-change` | `openspec-ff-change` | 快速生成全部 planning artifacts |
| `/opsx-update-change` | `openspec-update-change` | 更新 planning artifacts 并保持一致性 |
| `/opsx-sync-specs` | `openspec-sync-specs` | 同步 delta specs 到 main specs |
| `/opsx-verify-change` | `openspec-verify-change` | 验证实现与 artifact 匹配 |
| `/opsx-bulk-archive` | `openspec-bulk-archive-change` | 批量归档多个变更 |
| `/opsx-onboard` | `openspec-onboard` | 引导式完整工作流教学 |

## 注入方式

插件启动时通过 `config` hook 在运行时注入 commands 和 skills：

- **commands**：直接注册到 OpenCode 的 `config.command`，无需写入项目目录即可被 `/` 触发
- **skills**：将 `assets/skills/` 复制到系统临时目录，替换内部路径占位符后，通过 `config.skills.paths` 注册；进程退出时自动清理

## 本地开发

```bash
npm install
npm test
npm run build
```

## 致谢

本项目的工作流设计受到 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 启发。

## 文档索引

- [`README.zh.md`](README.zh.md)：中文 README 版本
- [`README.en.md`](README.en.md)：English README
- [`docs/zh/usage.md`](docs/zh/usage.md)：中文使用指南
- [`docs/zh/reference.md`](docs/zh/reference.md)：中文参考文档
- [`docs/zh/architecture.md`](docs/zh/architecture.md)：中文实现原理
- [`docs/en/usage.md`](docs/en/usage.md)：English usage guide
- [`docs/en/reference.md`](docs/en/reference.md)：English reference
- [`docs/en/architecture.md`](docs/en/architecture.md)：English architecture
