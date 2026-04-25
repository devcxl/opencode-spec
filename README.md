# opencode-spec

[![CI](https://github.com/devcxl/opencode-spec/actions/workflows/ci.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/ci.yml)
[![Release](https://github.com/devcxl/opencode-spec/actions/workflows/release.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/release.yml)
[![Publish to npm](https://github.com/devcxl/opencode-spec/actions/workflows/publish-npm.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/publish-npm.yml)

中文 | [English](README.en.md)

`opencode-spec` 是一个 OpenCode 插件，用于把 OpenSpec 风格的规格驱动开发流程接入 OpenCode。

## 核心能力

插件同步以下资源到项目 `.opencode/` 目录：

- **commands**：`/opsx-propose`、`/opsx-explore`、`/opsx-apply`、`/opsx-archive`
- **skills**：`openspec-propose`、`openspec-explore`、`openspec-apply`、`openspec-archive`
- **templates**：proposal.md、design.md、spec.md、tasks.md

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

原因：同步后的 skills / commands 会调用项目内 `.opencode/skills/**/references/*.js` 脚本。

## 工作流

```
propose → apply → archive
explore（可选，随时使用）
```

| 命令 | Skill | 功能 |
|------|-------|------|
| `/opsx-propose` | `openspec-propose` | 创建 change 并生成 proposal/specs/design/tasks |
| `/opsx-explore` | `openspec-explore` | 探索问题、澄清需求 |
| `/opsx-apply` | `openspec-apply` | 按 tasks 执行实现 |
| `/opsx-archive` | `openspec-archive` | 归档完成的 change |

## 资源同步

插件启动时自动同步资源到 `.opencode/` 目录：

- 目标文件不存在：直接写入
- 目标文件与插件版本一致：跳过
- 文件由插件升级引起变化：安全覆盖
- 文件被用户改过：写入 `.new` 文件

如 skills 首次写入或发生升级，建议重启 OpenCode。

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
