# opencode-spec

[![CI](https://github.com/devcxl/opencode-spec/actions/workflows/ci.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/ci.yml)
[![Release](https://github.com/devcxl/opencode-spec/actions/workflows/release.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/release.yml)
[![Publish to npm](https://github.com/devcxl/opencode-spec/actions/workflows/publish-npm.yml/badge.svg)](https://github.com/devcxl/opencode-spec/actions/workflows/publish-npm.yml)

中文 | [English](README.en.md)

`opencode-spec` 是一个 OpenCode 插件，用于把 OpenSpec 风格的规格驱动开发流程接入 OpenCode。

插件会把 commands、skills、templates 以及 reference scripts 同步到项目 `.opencode/` 目录，并在会话启动时提示同步结果。

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

原因：同步后的 skills / commands 会调用项目内 `.opencode/skills/**/references/*.js` 脚本。

启动 OpenCode 后，插件会自动同步以下资源：

- `.opencode/commands/opsx-*.md`
- `.opencode/skills/openspec-*/**`
- `.opencode/skills/_shared/**`
- `.opencode/opencode-spec/templates/*.md`

如果 commands 或 skills 是首次写入，或被插件升级覆盖，建议重启 OpenCode，让原生发现机制重新扫描。

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
- **reference scripts**：`.opencode/skills/<skill>/references/*.js`

如果你希望：

- **让 Agent 按预设提示组织流程**：优先用 commands / skills
- **显式执行底层脚本**：直接用 reference scripts

### 5. 理解资源同步行为

插件启动时会把内置资源同步到项目 `.opencode/` 目录。

同步规则如下：

- 目标文件不存在：直接写入
- 目标文件与插件版本一致：跳过
- 文件仅由插件升级引起变化：安全覆盖
- 文件被用户改过：不覆盖原文件，改为写入同名 `.new` 文件

如果出现 `.new` 文件，表示插件发现本地有人工修改，需要你手动合并。

详细使用示例见 [`docs/zh/usage.md`](docs/zh/usage.md)。

## 运行原理

这个插件的核心思路不是“把所有能力都动态注册进 OpenCode”，而是通过文件同步把 OpenSpec 工作流资源接入项目：

- **commands / skills / templates 由插件同步到项目目录**
- **reference scripts 由 skills 调用，直接操作 `openspec/` 目录结构**

启动时插件会：

1. 扫描包内 `assets/commands`、`assets/skills`、`assets/templates`
2. 把资源同步到项目 `.opencode/` 目录
3. 写入 `.opencode/opencode-spec.manifest.json` 记录已同步文件与哈希
4. 如果发现用户改过已同步文件，不强制覆盖，而是写入对应 `.new` 文件供人工合并
5. 在会话创建时输出提示，告知是否发生同步、冲突以及是否建议重启

这意味着 commands / skills 的新增或升级依赖 OpenCode 原生扫描，所以部分场景需要重启。

更详细的实现说明与限制见 [`docs/zh/architecture.md`](docs/zh/architecture.md)。

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
